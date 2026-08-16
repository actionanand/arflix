import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';

import { WatchlistBackup } from '../models/watchlist';

const MAX_BACKUP_BYTES = 256 * 1024;

interface ArflixNativeBridge {
  exportBackupJson?: (json: string, fileName: string) => void;
}

interface NativeWindow extends Window {
  ARFlixAndroid?: ArflixNativeBridge;
}

@Service()
export class BackupFileService {
  private readonly document = inject(DOCUMENT);

  export(backup: WatchlistBackup): 'native' | 'web' {
    const view = this.document.defaultView as NativeWindow | null;
    if (!view) throw new Error('File export is unavailable in this environment.');

    const json = `${JSON.stringify(backup, null, 2)}\n`;
    const fileName = `arflix-watchlist-${backup.exportedAt.slice(0, 10)}.json`;

    if (view.ARFlixAndroid?.exportBackupJson) {
      view.ARFlixAndroid.exportBackupJson(json, fileName);
      return 'native';
    }

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.hidden = true;
    this.document.body.append(link);
    link.click();
    link.remove();
    view.setTimeout(() => URL.revokeObjectURL(url), 0);
    return 'web';
  }

  async import(file: File): Promise<unknown> {
    if (file.size > MAX_BACKUP_BYTES) {
      throw new Error('This watchlist backup is too large.');
    }

    try {
      return JSON.parse(await file.text()) as unknown;
    } catch {
      throw new Error('This file does not contain valid JSON.');
    }
  }
}
