import { PhotoRecord } from './db';
import { detectPeopleInBatch } from './geminiService';

export interface PersonGroup {
  id: string;
  name: string;
  photos: PhotoRecord[];
  confidence: number;
}

export class PeopleEngine {
  static async clusterByFace(photos: PhotoRecord[]): Promise<PersonGroup[]> {
    const photoMap = photos.map(p => ({id: p.id!.toString(), path: p.path}));
    const clusters = await detectPeopleInBatch(photoMap);

    return Object.entries(clusters).map(([name, photoIds], entryIdx) => ({
            id: `person-${name.toLowerCase().replace(/\s/g, '-')}-${photoIds[0] || 'unknown'}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      name,
      photos: photos.filter(p => photoIds.includes(p.id!.toString())),
      confidence: 90
    }));
  }
}
