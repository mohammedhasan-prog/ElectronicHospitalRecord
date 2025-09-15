# Practitioners Management Module

## Overview
The Practitioners module provides comprehensive functionality for searching, viewing, and managing healthcare practitioners in the Oracle Health FHIR system. This module follows the Oracle Health FHIR R4 specification for practitioner resources.

## Features

### 🔍 **Advanced Search Capabilities**
- **Name Search**: Search by full name, family name, or given name
- **Identifier Search**: Search by NPI, DEA, or other professional identifiers
- **Status Filtering**: Filter by active/inactive status
- **Multiple Parameter Support**: Combine search parameters for precise results

### 📋 **Practitioner Information Display**
- **Basic Information**: Name, status (active/inactive), gender
- **Contact Details**: Phone number, email address
- **Address Information**: Work address with full formatting
- **Professional Identifiers**: NPI, DEA, SPI, and other credentials
- **Qualifications**: Medical degrees and certifications (MD, PhD, etc.)

### 🎨 **User Interface Features**
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Search**: Dynamic filtering as you type
- **Details Sidebar**: Click any practitioner to view detailed information
- **Status Indicators**: Visual indicators for active/inactive practitioners
- **Professional Icons**: Intuitive icons for different information types

## API Endpoints

### GET /api/practitioners

**Supported Query Parameters:**
- `_count`: Number of results to return (default: 20)
- `_id`: Specific practitioner ID(s) - supports multiple IDs separated by commas
- `active`: Boolean - filter by active status (true/false)
- `family`: String - search by family/last name
- `given`: String - search by given/first name
- `identifier`: String - search by professional identifiers (NPI, DEA, etc.)
- `name`: String - search by full name

**Example Requests:**
```
GET /api/practitioners?active=true&_count=10
GET /api/practitioners?name=Smith
GET /api/practitioners?family=Johnson&given=John
GET /api/practitioners?identifier=1234567890
GET /api/practitioners?_id=109413936,109413937
```

## Data Structure

### Practitioner Resource
```typescript
interface Practitioner {
  id: string;
  name: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  active: boolean;
  gender?: string;
  phone?: string;
  email?: string;
  address?: {
    text?: string;
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  identifiers?: Array<{
    type?: string;
    value: string;
    system?: string;
  }>;
  qualifications?: Array<{
    code: string;
    display?: string;
  }>;
}
```

## UI Components

### Search Form
- Multi-field search form with real-time validation
- Filters for name, family name, given name, identifier, and status
- Clear filters functionality
- Search and loading states

### Practitioners List
- Card-based layout showing key practitioner information
- Status indicators (active/inactive with visual icons)
- Clickable cards for detailed view
- Responsive grid layout

### Details Sidebar
- Comprehensive practitioner information display
- Organized sections for contact, address, identifiers, and qualifications
- Professional formatting for credentials and contact information
- Clear visual hierarchy with icons

## Oracle Health FHIR Compliance

This module fully complies with Oracle Health FHIR R4 specification:

- **Authorization Types**: Supports Patient, Provider, and System authorization
- **Search Parameters**: Implements all documented search parameters
- **Resource Structure**: Follows FHIR Practitioner resource structure
- **Error Handling**: Proper HTTP status codes and error responses
- **Data Mapping**: Correctly maps FHIR resource fields to UI display

## Usage Examples

### Basic Search
1. Navigate to `/practitioners`
2. Enter search criteria in any of the search fields
3. Click "Search" or press Enter
4. Results appear in the practitioners list

### Detailed View
1. Click on any practitioner in the list
2. Detailed information appears in the sidebar
3. View contact information, identifiers, and qualifications

### Filter by Status
1. Use the "Status" dropdown to filter by Active/Inactive practitioners
2. Results update automatically

## Testing

Run the test script to verify functionality:
```bash
node test-practitioners.js
```

The test script validates:
- API endpoint functionality
- Different search parameter combinations
- Error handling
- Response data structure

## Integration

The Practitioners module integrates with:
- **Navigation**: Main menu item with UserIcon
- **Dashboard Layout**: Responsive sidebar navigation
- **Authentication**: Oracle Health SMART v1 System authentication
- **Error Handling**: Centralized error display and logging

## Security

- **FHIR Authentication**: Uses Oracle Health SMART v1 System authentication
- **Token Management**: Automatic token refresh and caching
- **Secure API Calls**: All requests use proper authorization headers
- **Input Validation**: Client-side and server-side parameter validation

## Future Enhancements

Potential improvements for future versions:
- Practitioner profile editing
- Advanced filtering (by specialty, location, etc.)
- Export functionality
- Bulk operations
- Integration with appointment scheduling
- Photo/avatar support