/**
 * Universal NAS API Client Service
 */

const BASE_URL = '';

export async function getAuthStatus() {
  const res = await fetch(`${BASE_URL}/api/auth/status`, { credentials: 'include' });
  if (!res.ok) throw new Error('인증 상태를 확인할 수 없습니다.');
  return res.json();
}

export async function login(password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || '로그인에 실패했습니다.');
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export async function logout() {
  const res = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });
  return res.json();
}

export async function setupPassword(password) {
  const res = await fetch(`${BASE_URL}/api/auth/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || '초기 설정에 실패했습니다.');
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export async function getDrives(refresh = false) {
  const res = await fetch(`${BASE_URL}/api/drives${refresh ? '?refresh=true' : ''}`, {
    credentials: 'include'
  });
  if (!res.ok) throw new Error('드라이브 목록을 불러오지 못했습니다.');
  return res.json();
}

export async function getFiles(targetPath) {
  const res = await fetch(`${BASE_URL}/api/files?path=${encodeURIComponent(targetPath)}`, {
    credentials: 'include'
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || '파일 목록을 불러오지 못했습니다.');
    error.status = res.status;
    throw error;
  }
  return data;
}

export async function createFolder(parentPath, folderName) {
  const res = await fetch(`${BASE_URL}/api/mkdir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ path: parentPath, folderName })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '폴더 생성에 실패했습니다.');
  return data;
}

export async function renameItem(oldPath, newName) {
  const res = await fetch(`${BASE_URL}/api/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ path: oldPath, newName })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '이름 변경에 실패했습니다.');
  return data;
}

export async function deleteItems(paths) {
  const res = await fetch(`${BASE_URL}/api/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ paths: Array.isArray(paths) ? paths : [paths] })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '삭제에 실패했습니다.');
  return data;
}

export function getDownloadUrl(filePath) {
  return `${BASE_URL}/api/download?path=${encodeURIComponent(filePath)}`;
}

export async function getMediaInfo(filePath) {
  const res = await fetch(`${BASE_URL}/api/media-info?path=${encodeURIComponent(filePath)}`, {
    credentials: 'include'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '미디어 정보를 불러오지 못했습니다.');
  return data;
}

export function getSubtitleUrl(filePath, type = 'external', index = null) {
  let url = `${BASE_URL}/api/subtitle?path=${encodeURIComponent(filePath)}&type=${type}`;
  if (index !== null) {
    url += `&index=${index}`;
  }
  return url;
}

export function getViewStreamUrl(filePath, audioIndex = null, start = 0, forceRemux = false) {
  let url = `${BASE_URL}/api/view?path=${encodeURIComponent(filePath)}`;
  if (audioIndex !== null) url += `&audio_index=${audioIndex}`;
  if (start > 0) url += `&start=${start}`;
  if (forceRemux) url += `&remux=true`;
  return url;
}

/**
 * XHR 기반 실시간 업로드 (진행률 및 실시간 전송 속도 계산)
 */
export function uploadFilesWithProgress(targetPath, fileList, onProgress, onComplete, onError) {
  const formData = new FormData();
  for (let i = 0; i < fileList.length; i++) {
    formData.append('files', fileList[i]);
  }

  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${BASE_URL}/api/upload?path=${encodeURIComponent(targetPath)}`);
  xhr.withCredentials = true;

  let lastLoaded = 0;
  let lastTime = Date.now();

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      const now = Date.now();
      const timeDiff = (now - lastTime) / 1000; // 초

      let speedBps = 0;
      if (timeDiff >= 0.5) { // 0.5초마다 속도 갱신
        const bytesDiff = event.loaded - lastLoaded;
        speedBps = bytesDiff / timeDiff;
        lastLoaded = event.loaded;
        lastTime = now;
      }

      const percent = Math.round((event.loaded / event.total) * 100);
      if (onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent,
          speedBps
        });
      }
    }
  };

  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        const response = JSON.parse(xhr.responseText);
        if (onComplete) onComplete(response);
      } catch {
        if (onComplete) onComplete({ success: true });
      }
    } else {
      if (onError) onError(new Error(`업로드 실패 (코드: ${xhr.status})`));
    }
  };

  xhr.onerror = () => {
    if (onError) onError(new Error('네트워크 연결 문제로 업로드에 실패했습니다.'));
  };

  xhr.send(formData);

  return {
    abort: () => xhr.abort()
  };
}
