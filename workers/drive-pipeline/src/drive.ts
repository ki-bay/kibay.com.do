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

export async function listImageGroups(
	sa: ServiceAccount,
	folderId: string,
): Promise<ImageGroup[]> {
	const token = await getGoogleAccessToken(sa, DRIVE_SCOPES);
	const fileFields = 'id,name,mimeType,modifiedTime,webViewLink,imageMediaMetadata';

	// 1. Subfolders (each = one multi-image group)
	const folders = await driveList(
		token,
		`'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
		'id,name,modifiedTime',
	);

	// 2. Root-level image files (each = one single-image group)
	const rootImages = await driveList(
		token,
		`'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
		fileFields,
	);

	const groups: ImageGroup[] = [];

	for (const f of rootImages) {
		groups.push({
			key: f.id,
			name: f.name.replace(/\.[^.]+$/, ''),
			images: [f],
			isMultiImage: false,
			latestModified: f.modifiedTime,
		});
	}

	for (const folder of folders) {
		const images = await driveList(
			token,
			`'${folder.id}' in parents and mimeType contains 'image/' and trashed = false`,
			fileFields,
		);
		if (!images.length) continue;
		// Sort: alphabetical by filename for predictable hero selection
		images.sort((a, b) => a.name.localeCompare(b.name));
		// Cap at 5 images per post (FB album limit is fine; IG carousel max 10 but keep things reasonable + within waitUntil budget)
		const trimmed = images.slice(0, 5);
		const latest = trimmed.reduce((acc, x) => (x.modifiedTime > acc ? x.modifiedTime : acc), '');
		groups.push({
			key: folder.id,
			name: folder.name,
			images: trimmed,
			isMultiImage: true,
			latestModified: latest,
		});
	}

	return groups;
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
