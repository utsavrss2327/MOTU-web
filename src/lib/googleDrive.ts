// Google Drive Integration Placeholder
// You must provide a valid Client ID from Google Cloud Console to use this integration.

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export async function uploadToDrive(fileName: string, jsonContent: any, accessToken: string) {
  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const metadata = {
    name: `${fileName}.tldr`,
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([JSON.stringify(jsonContent)], { type: 'application/json' }));

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error('Failed to upload to Google Drive');
  }

  return response.json();
}
