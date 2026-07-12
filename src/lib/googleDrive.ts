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

  const boundary = '-------314159265358979323846';
  const delimiter = "--" + boundary + "\r\n";
  const inner_delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    inner_delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(jsonContent) +
    close_delim;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    let errText = '';
    try {
      errText = await response.text();
    } catch (e) {}
    throw new Error(`Drive API Error (${response.status}): ${errText}`);
  }

  return response.json();
}
