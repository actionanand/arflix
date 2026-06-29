import { Service, inject } from '@angular/core';

import { environment } from '../../environments/environment';
import { ArCollectionItem, ArCollectionRow } from '../models/ar-collection';
import { MediaType } from '../models/tmdb';
import { TmdbService } from './tmdb.service';

interface GvizCell {
  f?: string;
  v?: unknown;
}

interface GvizRow {
  c?: (GvizCell | null)[];
}

interface GvizResponse {
  table?: {
    rows?: GvizRow[];
  };
}

@Service()
export class ArCollectionService {
  private readonly tmdb = inject(TmdbService);
  private readonly sheetId = environment.GOOGLE_SHEET_ID;
  private readonly sheetGid = environment.SHEET_GID;

  async getCollection(abortSignal?: AbortSignal): Promise<ArCollectionItem[]> {
    const rows = await this.getSheetRows(abortSignal);

    return Promise.all(
      rows.map(async (row) => ({
        sheet: row,
        media: await this.findMedia(row, abortSignal),
      })),
    );
  }

  private async getSheetRows(abortSignal?: AbortSignal): Promise<ArCollectionRow[]> {
    const url = new URL(`https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq`);
    url.searchParams.set('tqx', 'out:json');
    url.searchParams.set('gid', String(this.sheetGid));

    const response = await fetch(url, {
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`AR collection sheet request failed with status ${response.status}`);
    }

    return this.toCollectionRows(this.parseGvizResponse(await response.text()));
  }

  private async findMedia(
    row: ArCollectionRow,
    abortSignal?: AbortSignal,
  ): Promise<ArCollectionItem['media']> {
    try {
      return await this.tmdb.findTitleInfo(row.title, this.typeHint(row.type), abortSignal);
    } catch {
      return null;
    }
  }

  private parseGvizResponse(text: string): GvizResponse {
    const objectStart = text.indexOf('{');
    const objectEnd = text.lastIndexOf('}');

    if (objectStart < 0 || objectEnd <= objectStart) {
      throw new Error('AR collection sheet returned an unexpected response');
    }

    return JSON.parse(text.slice(objectStart, objectEnd + 1)) as GvizResponse;
  }

  private toCollectionRows(response: GvizResponse): ArCollectionRow[] {
    return (response.table?.rows ?? [])
      .filter((row) => this.cellText(row, 0))
      .filter((row) => !this.isHeaderRow(row))
      .map((row) => ({
        serialNumber: this.cellText(row, 0),
        title: this.cellText(row, 1),
        type: this.cellText(row, 2),
        platform: this.cellText(row, 3),
        language: this.cellText(row, 4),
        category: this.cellText(row, 5),
        isAdult: this.cellText(row, 6) || 'No',
        comment: this.cellText(row, 7),
      }))
      .filter((row) => row.title);
  }

  private cellText(row: GvizRow, index: number): string {
    const cell = row.c?.[index];

    if (!cell) {
      return '';
    }

    if (typeof cell.f === 'string') {
      return cell.f.trim();
    }

    return cell.v === undefined || cell.v === null ? '' : String(cell.v).trim();
  }

  private isHeaderRow(row: GvizRow): boolean {
    return (
      this.cellText(row, 0).toLowerCase() === 's no' ||
      this.cellText(row, 1).toLowerCase() === 'title'
    );
  }

  private typeHint(type: string): MediaType | 'all' {
    const normalized = type.toLowerCase();

    if (normalized.includes('movie') || normalized.includes('film')) {
      return 'movie';
    }

    if (
      normalized.includes('series') ||
      normalized.includes('serial') ||
      normalized.includes('show') ||
      normalized.includes('tv') ||
      normalized.includes('web')
    ) {
      return 'tv';
    }

    return 'all';
  }
}
