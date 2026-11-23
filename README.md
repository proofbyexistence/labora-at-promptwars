# LABORA — Every lab. One notebook.

LABORA (LabLink) is a notebook-themed campus laboratory resource-sharing platform that makes university instruments, development kits, workstations, and safety gear discoverable and bookable across departments.

## Pages

- **Home**: Overview spread, live inventory summary, "Browse by subject" department directory, and ready-to-book instruments.
- **Discover**: Search and filter campus equipment by department, laboratory, equipment type, availability status, and access level.
- **Smart Booking**: Inspect instrument slots by date and reserve or release bench windows.
- **Request Access**: Submit access requests for faculty-approved or training-required instruments and monitor request status.
- **Faculty Approvals**: Switch to the faculty supervisor role to review, request info on, approve, or deny access requests.

## Folder Structure

```text
├── index.html
├── metadata.json
├── package.json
├── README.md
└── src/
    ├── App.tsx
    ├── index.css
    ├── main.tsx
    ├── assets/images/        # Local laboratory and instrument photography
    ├── components/
    │   ├── EquipmentCard.tsx # Reusable equipment card template
    │   └── Layout.tsx        # Shared navbar, Lab Index sidebar, breadcrumbs, and footer
    ├── css/
    │   ├── tokens.css        # Design tokens (colors, fonts, spacing, radius, shadows)
    │   └── pages.css         # Shared notebook surface and typography rules
    ├── data/
    │   └── labs.json         # 7 departments, 14 labs, 43 items, slots, 6 requests, users
    ├── js/
    │   ├── labData.ts        # Shared data module with in-memory state + localStorage persistence
    │   └── types.ts          # TypeScript interfaces for the campus lab domain
    ├── pages/
    │   ├── HomePage.tsx
    │   ├── DiscoverPage.tsx
    │   ├── SmartBookingPage.tsx
    │   ├── RequestAccessPage.tsx
    │   └── FacultyApprovalsPage.tsx
    └── tests/
        └── labData.test.ts   # Automated checks for dataset structure, filters, and mutations
```

## How to Run

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server on port 3000:
   ```bash
   npm run dev
   ```
3. Run the data layer tests:
   ```bash
   npx tsx src/tests/labData.test.ts
   ```
4. Typecheck and build for production:
   ```bash
   npm run lint
   npm run build
   ```
