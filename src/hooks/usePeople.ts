import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { PeopleEngine, PersonGroup } from '../services/peopleEngine';

export function usePeople(addNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void) {
  const [peopleGroups, setPeopleGroups] = useState<PersonGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPeople = async () => {
    setLoading(true);
    // In a real app, this would use PeopleEngine to analyze faces across the library
    // For now, we simulate or load from a specialized table if we had one
    const photos = await db.photos.where('isDeleted').equals(0).toArray();
    const groups = await PeopleEngine.clusterByFace(photos);
    setPeopleGroups(groups);
    setLoading(false);
  };

  const renamePerson = async (clusterId: string, oldName: string) => {
    const newName = prompt('Enter new identity for this cluster:', oldName);
    if (newName && newName !== oldName) {
      setPeopleGroups(prev => prev.map(g => g.id === clusterId ? { ...g, name: newName } : g));
      addNotification('Identity Updated', `Cluster re-mapped to ${newName}.`, 'success');
    }
  };

  useEffect(() => {
    loadPeople();

    const handleDbUpdated = () => {
      loadPeople();
    };

    window.addEventListener('photos-database-updated', handleDbUpdated);
    return () => {
      window.removeEventListener('photos-database-updated', handleDbUpdated);
    };
  }, []);

  return {
    peopleGroups,
    setPeopleGroups,
    loading,
    renamePerson,
    loadPeople
  };
}
