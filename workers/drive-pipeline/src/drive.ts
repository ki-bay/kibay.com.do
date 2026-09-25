import { getGoogleAccessToken, ServiceAccount } from './jwt';

const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

export interface DriveFile {
	id: string;
	name: string;
	mimeType: string;
	modifiedTime: string;
	webViewLink?: string;
	imageMediaMetadata?: { width?: number; height?: number };
}

// A group of one or more images that should become ONE blog post.
// - Root-level image file → group with 1 image, key = file id, name = file name (without ext)
// - Subfolder under the watched folder → group with the folder's images, key = folder id, name = folder name
export interface ImageGroup {
	key: string;
	name: string;
	images: DriveFile[];
	isMultiImage: boolean;
	latestModified: string;
}

async function driveList(token: string, q: string, fields: string): Promise<DriveFile[]> {
	const url =
		`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}` +
		`&fields=files(${fields}),incompleteSearch` +
		`&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true`;
	const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
	if (!r.ok) throw new Error(`Drive list failed: ${r.status} ${await r.text()}`);
	const json = (await r.json()) as { files: DriveFile[] };
	return json.files || [];
}

// A group, before its images have been fetched. listGroupStubs used to fetch
// every subfolder's images eagerly (one Drive API round-trip per subfolder),
// which scaled fine while the watched folder had a couple dozen subfolders
// but became the pipeline's actual bottleneck once it grew past ~150 — each
// invocation only ever processes ONE group (see runPipeline), so eagerly
// listing images for every OTHER group was pure waste that ate the
// invocation's time budget before the real work even started. Root-level
// image files are cheap (their "images" are already known from the single
// listing call), so those still carry a resolved ImageGroup inline.
export type GroupStub =
	| { key: string; name: string; isMultiImage: false; resolved: ImageGroup }
	| { key: string; name: string; isMultiImage: true; folderId: string };

export async function listGroupStubs(sa: ServiceAccount, folderId: string): Promise<GroupStub[]> {
	const token = await getGoogleAccessToken(sa, DRIVE_SCOPES);
	const fileFields = 'id,name,mimeType,modifiedTime,webViewLink,imageMediaMetadata';

	// 1. Subfolders (each = one multi-image group) — cheap, folder metadata only.
	const folders = await driveList(
		token,
		`'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
		'id,name,modifiedTime',
	);

	// 2. Root-level image files (each = one single-image group) — already
	// carries everything a group needs, no extra call required.
	const rootImages = await driveList(
		token,
		`'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
		fileFields,
	);

	const stubs: GroupStub[] = [];

	for (const f of rootImages) {
		stubs.push({
			key: f.id,
			name: f.name.replace(/\.[^.]+$/, ''),
			isMultiImage: false,
			resolved: {
				key: f.id,
				name: f.name.replace(/\.[^.]+$/, ''),
				images: [f],
				isMultiImage: false,
				latestModified: f.modifiedTime,
			},
		});
	}

	for (const folder of folders) {
		stubs.push({ key: folder.id, name: folder.name, isMultiImage: true, folderId: folder.id });
	}

	return stubs;
}

// Fetches a multi-image group's actual images. Only called for the ONE
// group runPipeline is about to process — this is the call that used to
// happen eagerly for every subfolder in listImageGroups.
export async function loadGroupImages(sa: ServiceAccount, stub: GroupStub): Promise<ImageGroup | null> {
	if (!stub.isMultiImage) return stub.resolved;

	const token = await getGoogleAccessToken(sa, DRIVE_SCOPES);
	const fileFields = 'id,name,mimeType,modifiedTime,webViewLink,imageMediaMetadata';
	const images = await driveList(
		token,
		`'${stub.folderId}' in parents and mimeType contains 'image/' and trashed = false`,
		fileFields,
	);
	if (!images.length) return null;
	// Sort: alphabetical by filename for predictable hero selection
	images.sort((a, b) => a.name.localeCompare(b.name));
	// Cap at 5 images per post (FB album limit is fine; IG carousel max 10 but keep things reasonable + within waitUntil budget)
	const trimmed = images.slice(0, 5);
	const latest = trimmed.reduce((acc, x) => (x.modifiedTime > acc ? x.modifiedTime : acc), '');
	return {
		key: stub.key,
		name: stub.name,
		images: trimmed,
		isMultiImage: true,
		latestModified: latest,
	};
}

export async function downloadDriveFile(
	sa: ServiceAccount,
	fileId: string,
): Promise<{ bytes: ArrayBuffer; contentType: string }> {
	const token = await getGoogleAccessToken(sa, DRIVE_SCOPES);
	const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
		fileId,
	)}?alt=media&supportsAllDrives=true`;
	const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
	if (!r.ok) throw new Error(`Drive download failed: ${r.status} ${await r.text()}`);
	return {
		bytes: await r.arrayBuffer(),
		contentType: r.headers.get('content-type') || 'application/octet-stream',
	};
}

// Returns a web-sized JPEG of a Drive image instead of the multi-megabyte
// original. The Drive folder holds camera originals (median ~18MB, up to
// ~39MB); 133 of 163 exceeded Anthropic's ~7.5MB-raw vision limit, and the
// blog was publishing those raw files as-is. Drive serves a resized rendition
// through the file's thumbnailLink (size is the trailing "=sNNN"); requesting
// =s2048 returns a ~1MB JPEG in ~1s with no image library and no CPU cost.
export async function downloadDriveImageResized(
	sa: ServiceAccount,
	fileId: string,
	maxDim = 2048,
): Promise<{ bytes: ArrayBuffer; contentType: string }> {
	const token = await getGoogleAccessToken(sa, DRIVE_SCOPES);
	const metaUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
		fileId,
	)}?fields=thumbnailLink,size,mimeType&supportsAllDrives=true`;
	const mr = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
	if (!mr.ok) throw new Error(`Drive metadata failed: ${mr.status} ${await mr.text()}`);
	const meta = (await mr.json()) as { thumbnailLink?: string; size?: string };

	if (meta.thumbnailLink) {
		const r = await fetch(meta.thumbnailLink.replace(/=s\d+$/, `=s${maxDim}`));
		const ct = r.headers.get('content-type') || '';
		if (r.ok && ct.startsWith('image/')) return { bytes: await r.arrayBuffer(), contentType: ct };
	}

	// No rendition available: the original is only usable if it is small.
	const size = Number(meta.size || 0);
	if (size > 0 && size <= 7 * 1024 * 1024) return downloadDriveFile(sa, fileId);
	throw new Error(`no resized rendition available and original is too large (${size} bytes)`);
}
