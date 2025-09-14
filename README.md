# EHR Integration Dashboard

This is a Next.js project designed to integrate with an EHR system using SMART on FHIR. It provides a dashboard for managing patients and appointments.

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm, yarn, or pnpm

### 1. Set up Environment Variables

Create a `.env.local` file in the root of the project by copying the example file:

```bash
cp .env.example .env.local
```

Now, open `.env.local` and fill in the required credentials for your SMART on FHIR application:

```
# .env.local
TENANT_ID="your_tenant_id"
CLIENT_ID="your_client_id"
CLIENT_SECRET="your_client_secret"

# Optional: Override the default Cerner authorization host
# AUTH_HOST="https://authorization.cerner.com"

# Optional: The root URL of the FHIR server.
# If provided, the application will attempt to use .well-known/smart-configuration for discovery.
# FHIR_ROOT="https://fhir-ehr-code.cerner.com/r4"
FHIR_ROOT_HOST="https://fhir-ehr-code.cerner.com/r4"
```

**IMPORTANT:** Never commit the `.env.local` file to your repository.

### 2. Install Dependencies

Install the project dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Run the Development Server

Start the Next.js development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Patient Search PoC

To test the Patient Search proof-of-concept, navigate to [http://localhost:3000/patients](http://localhost:3000/patients). You can search for patients by name.

### Example `curl` commands

You can also test the API endpoints directly.

**1. Fetch a token (via our API - this is an indirect way to test `getAccessToken`)**
This command will trigger the patient search, which in turn fetches a token.

```bash
# Search for a patient named "Smith"
curl "http://localhost:3000/api/patients?name=Smith"
```

**2. Test Patient Search API**

```bash
# Replace with a name that exists in your sandbox
curl "http://localhost:3000/api/patients?name=Smith"
```

The response should be a JSON object containing a list of patients.

## Project Structure

- `src/app/`: Contains the application's pages and API routes.
- `src/lib/`: Contains shared library functions, including `auth.ts` for handling SMART on FHIR authentication.
- `swagger.json`: The OpenAPI specification for the FHIR API.
- `api_summary.md`: A summary of the API endpoints used in this project.
- `.env.example`: An example environment file.
