// src/lib/simple-storage.ts
// Simple in-memory storage for demo purposes
// In production, this would be a database

const patients = new Map<string, any>();

export function storePatient(id: string, patient: any) {
  patients.set(id, patient);
}

export function getPatient(id: string) {
  return patients.get(id);
}

export function getAllPatients() {
  return Array.from(patients.values());
}