/**
 * Patient Search Enhancement for Appointment Creation
 * 
 * This enhancement adds real-time patient search functionality to the appointment
 * creation form, allowing users to search for patients by name or MRN instead
 * of selecting from a static dropdown list.
 * 
 * Features:
 * - Real-time search with debouncing (300ms delay)
 * - Search by patient name (given and family names)
 * - Search by identifier/MRN if name search returns no results
 * - Display patient details (name, DOB, gender, MRN) in dropdown
 * - Selected patient display with clear option
 * - Click outside to close dropdown
 * - Integration with existing form validation
 * 
 * API Endpoints Used:
 * - GET /api/patients?name={query}&_count=10
 * - GET /api/patients?identifier={query}&_count=10
 * 
 * The search follows Oracle Health FHIR standards for patient search parameters.
 */

// Test search queries you can try:
// 1. Search by name: "John", "Smith", "Jane"
// 2. Search by MRN: Enter patient identifier numbers
// 3. Partial matches work for names
// 4. Case-insensitive search

console.log('Patient search enhancement loaded for appointment creation');