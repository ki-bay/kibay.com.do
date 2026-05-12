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

export async function listFolderImages(
	sa: ServiceAccount,
	folderId: string,
): Promise<DriveFile[]> {
	const token = await getGoogleAccessToken(sa, DRIVE_SCOPES);
	const q = encodeURIComponent(
		`'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
	);
	const url =
		`https://www.googleapis.com/drive/v3/files?q=${q}` +
		`&fields=files(id,name,mimeType,modifiedTime,webViewLink,imageMediaMetadata),incompleteSearch` +
		`&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true`;
	const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
	if (!r.ok) throw new Error(`Drive list failed: ${r.status} ${await r.text()}`);
	const json = (await r.json()) as { files: DriveFile[] };
	return json.files || [];
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
