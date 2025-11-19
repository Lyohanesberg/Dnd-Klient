import { DriveFile } from '../types';

// Global type definitions
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

let currentClientId = process.env.GOOGLE_CLIENT_ID || '';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/drive.file";

let tokenClient: any;
let isGapiInitialized = false;

export const isDriveConfigured = () => !!currentClientId;

export const setClientId = (id: string) => {
  currentClientId = id;
  tokenClient = null; // Reset the client so it re-initializes with the new ID
};

export const initGoogleServices = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject("Window not defined");
      return;
    }

    // If GAPI is already initialized, we only need to ensure TokenClient is ready (e.g. if Client ID was just set)
    if (isGapiInitialized) {
       if (currentClientId && window.google && !tokenClient) {
            try {
              tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: currentClientId,
                scope: SCOPES,
                callback: (resp: any) => {}, // Placeholder callback
              });
            } catch (e) {
                console.error("Error re-initializing token client", e);
            }
       }
       resolve();
       return;
    }

    const checkScripts = setInterval(() => {
      if (window.gapi && window.google) {
        clearInterval(checkScripts);
        
        // Init GAPI Client
        window.gapi.load("client", async () => {
          try {
            await window.gapi.client.init({
              discoveryDocs: DISCOVERY_DOCS,
            });
            
            isGapiInitialized = true;

            // Init GIS Token Client if ID is present
            if (currentClientId) {
              tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: currentClientId,
                scope: SCOPES,
                callback: (resp: any) => {}, // Placeholder callback
              });
            }
            
            resolve();
          } catch (e) {
            console.error("GAPI init error", e);
            reject(e);
          }
        });
      }
    }, 100);
    
    // Timeout safety
    setTimeout(() => {
        clearInterval(checkScripts);
        if (!window.gapi || !window.google) {
            console.warn("Google scripts timeout");
            resolve(); 
        }
    }, 5000);
  });
};

export const signInToGoogle = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Try to init token client if it's missing (late config)
    if (!tokenClient) {
       if (currentClientId && window.google) {
          try {
              tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: currentClientId,
                scope: SCOPES,
                callback: (resp: any) => {}, // Placeholder callback
              });
          } catch (e) {
              reject(e);
              return;
          }
       } else {
          reject("Google Services not initialized or Client ID missing");
          return;
       }
    }

    // Override callback for the explicit sign-in flow
    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        reject(resp);
      }
      resolve(resp.access_token);
    };

    // Request token. Empty prompt means Google decides (often silent if already signed in).
    // 'consent' forces the screen, which is safer for strict flows but annoying and sometimes triggers security checks.
    // We use empty object to let GIS handle it naturally.
    tokenClient.requestAccessToken({});
  });
};

export const signOutFromGoogle = () => {
  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken(null);
  }
};

export const listSaveFiles = async (): Promise<DriveFile[]> => {
  try {
    const response = await window.gapi.client.drive.files.list({
      q: "mimeType='application/json' and name contains 'dnd_ai_save_' and trashed=false",
      fields: "files(id, name, createdTime, modifiedTime)",
      spaces: "drive",
    });
    return response.result.files || [];
  } catch (err) {
    console.error("Error listing files", err);
    throw err;
  }
};

export const saveGameToDrive = async (gameState: any, fileName?: string): Promise<DriveFile> => {
  const name = fileName || `dnd_ai_save_${gameState.character.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
  const content = JSON.stringify(gameState, null, 2);
  
  const fileMetadata = {
    name: name,
    mimeType: 'application/json',
  };

  const multipartRequestBody =
    `\r\n--foo_bar_baz\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(fileMetadata) +
    `\r\n--foo_bar_baz\r\nContent-Type: application/json\r\n\r\n` +
    content +
    `\r\n--foo_bar_baz--`;

  try {
    const response = await window.gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: {
        uploadType: 'multipart',
      },
      headers: {
        'Content-Type': 'multipart/related; boundary=foo_bar_baz',
      },
      body: multipartRequestBody,
    });
    return response.result;
  } catch (err) {
    console.error("Error saving file", err);
    throw err;
  }
};

export const loadGameFromDrive = async (fileId: string): Promise<any> => {
  try {
    const response = await window.gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media',
    });
    return response.result;
  } catch (err) {
    console.error("Error loading file", err);
    throw err;
  }
};

export const deleteGameFromDrive = async (fileId: string): Promise<void> => {
  try {
    await window.gapi.client.drive.files.delete({
      fileId: fileId,
    });
  } catch (err) {
    console.error("Error deleting file", err);
    throw err;
  }
};