# API Summary

This document summarizes the FHIR R4 APIs that will be used for the EHR Integration Dashboard, based on the provided `swagger.json`.

**Authentication:** All endpoints requiring authentication will use the SMART v1 System flow (client_credentials grant) to obtain an access token. The required scopes follow the pattern `system/<Resource>.<permission>`.

---

## Patient Management

| Endpoint | HTTP Verb | Description | Required Scopes (System) | Read/Write |
| :--- | :--- | :--- | :--- | :--- |
| `/Patient` | `GET` | Search for patients based on criteria like name, ID, etc. | `system/Patient.read` | Read |
| `/Patient` | `POST` | Create a new patient record. | `system/Patient.write` | Write |
| `/Patient/{id}` | `GET` | Retrieve a specific patient's record by their ID. | `system/Patient.read` | Read |
| `/Patient/{id}` | `PUT` | Update a patient's demographics and contact information. | `system/Patient.write` | Write |
| `/Patient/{id}` | `PATCH` | Partially update a patient's record. | `system/Patient.write` | Write |

---

## Appointment Scheduling

| Endpoint | HTTP Verb | Description | Required Scopes (System) | Read/Write |
| :--- | :--- | :--- | :--- | :--- |
| `/Appointment` | `GET` | Search for appointments (e.g., by date, patient, provider). | `system/Appointment.read` | Read |
| `/Appointment` | `POST` | Create a new appointment. | `system/Appointment.write` | Write |
| `/Appointment/{id}` | `GET` | Retrieve a specific appointment by its ID. | `system/Appointment.read` | Read |
| `/Appointment/{id}` | `PUT` | Update/reschedule an existing appointment. | `system/Appointment.write` | Write |

---

## Clinical Data

### Observation (Vitals, etc.)

| Endpoint | HTTP Verb | Description | Required Scopes (System) | Read/Write |
| :--- | :--- | :--- | :--- | :--- |
| `/Observation` | `GET` | Search for observations for a patient. | `system/Observation.read` | Read |
| `/Observation` | `POST` | Create a new observation (e.g., vitals). | `system/Observation.write` | Write |
| `/Observation/{id}` | `GET` | Retrieve a specific observation by its ID. | `system/Observation.read` | Read |

### Allergy Intolerance

| Endpoint | HTTP Verb | Description | Required Scopes (System) | Read/Write |
| :--- | :--- | :--- | :--- | :--- |
| `/AllergyIntolerance` | `GET` | Search for a patient's allergies. | `system/AllergyIntolerance.read` | Read |
| `/AllergyIntolerance` | `POST` | Create a new allergy record. | `system/AllergyIntolerance.write` | Write |
| `/AllergyIntolerance/{id}` | `GET` | Retrieve a specific allergy record. | `system/AllergyIntolerance.read` | Read |
| `/AllergyIntolerance/{id}` | `PUT` | Update an allergy record. | `system/AllergyIntolerance.write` | Write |

### Condition (Problems)

| Endpoint | HTTP Verb | Description | Required Scopes (System) | Read/Write |
| :--- | :--- | :--- | :--- | :--- |
| `/Condition` | `GET` | Search for a patient's conditions. | `system/Condition.read` | Read |
| `/Condition` | `POST` | Create a new condition record. | `system/Condition.write` | Write |
| `/Condition/{id}` | `GET` | Retrieve a specific condition record. | `system/Condition.read` | Read |
| `/Condition/{id}` | `PUT` | Update a condition record. | `system/Condition.write` | Write |

---

## Billing

| Endpoint | HTTP Verb | Description | Required Scopes (System) | Read/Write |
| :--- | :--- | :--- | :--- | :--- |
| `/Coverage` | `GET` | Search for a patient's insurance coverage. | `system/Coverage.read` | Read |
| `/Coverage/{id}` | `GET` | Retrieve a specific coverage record. | `system/Coverage.read` | Read |
| `/Claim` | `GET` | Search for claims. | `system/Claim.read` | Read |
| `/Claim/{id}` | `GET` | Retrieve a specific claim. | `system/Claim.read` | Read |

---
*Note: Read/Write status is inferred from the HTTP method. The exact required scopes will be confirmed during implementation based on the API responses.*
