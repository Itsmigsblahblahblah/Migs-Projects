# Visual Guide: Registered Farmers Feature

## UI Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN DASHBOARD                             │
├─────────────────────────────────────────────────────────────────┤
│  Admin Dashboard                                    [Manage Rules]│
│  Welcome back, Admin. Here's your farm management overview.      │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ Active     │  │ Pending    │  │ Resolved   │  │ Success    │ │
│  │ Farmers    │  │ Reports    │  │ This Month │  │ Rate       │ │
│  │    12      │  │     5      │  │     8      │  │    85%     │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [Registered Farmers] [Analytics] [Reports] [Location Map]│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  REGISTERED FARMERS TAB CONTENT                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Registered Farmers                                      │    │
│  │  List of all farmers registered in the system (12 total)│    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │ [PHOTO]  Juan Dela Cruz                          │   │    │
│  │  │  ○       Dela Cruz Farm               [Farmer]   │   │    │
│  │  │          📧 juan@example.com                      │   │    │
│  │  │          🏠 Home: 123 Main St, Majayjay          │   │    │
│  │  │          📍 Farm: Lot 45, Barangay 1              │   │    │
│  │  │          📅 Registered: January 15, 2025          │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │ [PHOTO]  Maria Santos                            │   │    │
│  │  │  MS      Santos Farm                  [Farmer]   │   │    │
│  │  │          📧 maria@example.com                     │   │    │
│  │  │          🏠 Home: 456 Oak Ave, Majayjay          │   │    │
│  │  │          📍 Farm: Lot 12, Barangay 3              │   │    │
│  │  │          📅 Registered: January 10, 2025          │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  │  ... more farmers ...                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Farmer Detail Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [← Back to Admin Dashboard]                                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Farmer Profile                                          │    │
│  │  Detailed information and crop history                   │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  ┌─────────┐                                             │    │
│  │  │ [PHOTO] │  Juan Dela Cruz                             │    │
│  │  │  Large  │  Dela Cruz Farm                             │    │
│  │  │ Circular│                                             │    │
│  │  └─────────┘  ──────────────────────────────────────    │    │
│  │               📧 Email: juan@example.com                 │    │
│  │               📅 Registered: January 15, 2025            │    │
│  │               🏠 Home Address: 123 Main St, Majayjay     │    │
│  │               📍 Farm Address: Lot 45, Barangay 1        │    │
│  │               📊 Total Farm Land Area: 5.5 hectares      │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Total Crops  │  │ In Progress  │  │ Harvested    │         │
│  │      8       │  │      5       │  │      3       │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
├─────────────────────────────────────────────────────────────────┤
│  🌱 In Progress Crops                                           │
│  5 crops currently growing                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [🍃] Rice                          [In Progress]         │   │
│  │      Planted: Jan 10, 2025                               │   │
│  │      ─────────────────────────────────────────────       │   │
│  │      Land Area: 2 hectares    Quantity: 500 kg           │   │
│  │      Soil Type: Loam          Investment: ₱15,000        │   │
│  │      N: 80  P: 60  K: 40                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [🍃] Corn                          [In Progress]         │   │
│  │      Planted: Jan 15, 2025                               │   │
│  │      ... crop details ...                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ... more in-progress crops ...                                 │
├─────────────────────────────────────────────────────────────────┤
│  📦 Harvested Crops                                             │
│  3 crops successfully harvested                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [📦] Tomatoes                      [Harvested]           │   │
│  │      Planted: Oct 15, 2024                               │   │
│  │      ─────────────────────────────────────────────       │   │
│  │      Land Area: 1 hectare     Quantity: 300 kg           │   │
│  │      Soil Type: Sandy         Investment: ₱8,000         │   │
│  │      N: 70  P: 50  K: 35                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ... more harvested crops ...                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Navigation Flow Diagram

```
                    ┌────────────────────┐
                    │  Admin Dashboard   │
                    └──────────┬─────────┘
                               │
                               │ Click "Registered Farmers" tab
                               ▼
                    ┌────────────────────┐
                    │   Farmers List     │
                    │  (Same page - no   │
                    │   reload)          │
                    └──────────┬─────────┘
                               │
                               │ Click on a farmer
                               ▼
                    ┌────────────────────┐
                    │ Farmer Detail Page │
                    │  /admin/farmer/:id │
                    └──────────┬─────────┘
                               │
                               │ Click "Back" button
                               ▼
                    ┌────────────────────┐
                    │  Admin Dashboard   │
                    └────────────────────┘
```

## Component Structure

```
AdminDashboard
├── Header (Welcome Section)
├── Stats Cards (4 cards)
└── Tabs
    ├── Registered Farmers Tab ⭐ NEW
    │   └── FarmersList
    │       └── FarmerCard (repeated)
    │           ├── Avatar (circular)
    │           ├── Name & Farm Name
    │           ├── Email
    │           ├── Addresses
    │           └── Registration Date
    ├── Analytics Tab
    ├── Reports Tab
    └── Location Map Tab

FarmerDetailPage ⭐ NEW
├── Back Button
├── Profile Card
│   ├── Large Avatar
│   └── Profile Information
├── Statistics Cards (3 cards)
├── In Progress Crops Card
│   └── CropItem (repeated)
└── Harvested Crops Card
    └── CropItem (repeated)
```

## Data Flow Diagram

```
┌──────────────┐
│   Firestore  │
│              │
│  ┌────────┐  │
│  │farmers │  │◄─────┐
│  └────────┘  │      │
│              │      │ Query all farmers
│  ┌──────────┐│      │ (admin access)
│  │farmerCrops││◄───┐ │
│  └──────────┘│    │ │
└──────────────┘    │ │
                    │ │
              ┌─────┴─┴──────────┐
              │  AdminDashboard  │
              │                  │
              │  loadFarmers()   │
              │  ├─ Query farmers│
              │  └─ Set state    │
              └─────┬────────────┘
                    │
                    │ Display farmers list
                    │
              ┌─────▼────────────┐
              │  FarmersList     │
              │  (Tab Content)   │
              └─────┬────────────┘
                    │
                    │ Click farmer
                    │
              ┌─────▼─────────────┐
              │ FarmerDetailPage  │
              │                   │
              │ loadFarmerDetails()│
              │ ├─ Get farmer doc │
              │ └─ Query crops    │
              └───────────────────┘
```

## Crop Status Logic

```
When crop is loaded:
  ↓
Calculate days since planting
  ↓
┌─────────────────────┐
│ Days < 90?          │
└────┬────────────┬───┘
     │ YES        │ NO
     ↓            ↓
┌────────────┐  ┌──────────┐
│In Progress │  │Harvested │
│   Badge    │  │  Badge   │
└────────────┘  └──────────┘
```

## Styling Features

### Color Scheme (Consistent with App)
- **Primary**: Gradient green (farming theme)
- **Success**: Green for harvested crops
- **Warning**: Yellow/Orange for in-progress
- **Muted**: Gray for secondary information
- **Background**: White/Light gray cards

### Interactive Elements
- **Hover**: Background changes to `muted/50`
- **Cursor**: Pointer on clickable items
- **Transitions**: Smooth color/opacity changes
- **Borders**: Subtle rounded corners

### Typography
- **Headings**: Bold, larger font
- **Labels**: Smaller, muted color
- **Values**: Medium weight, normal color
- **Badges**: Small, colored backgrounds

### Spacing
- **Card Padding**: 4-6 units
- **Gap Between Items**: 4 units
- **Section Spacing**: 6 units
- **Grid Gaps**: 3-4 units

## Responsive Breakpoints

```
Mobile (< 768px)
├── Single column layout
├── Stacked information
└── Reduced padding

Tablet (768px - 1024px)
├── 2-column grids
├── Compact spacing
└── Smaller avatars

Desktop (> 1024px)
├── 3-4 column grids
├── Full spacing
└── Large avatars
```

## Icon Legend

📧 Email
🏠 Home Address
📍 Farm Address
📅 Date/Calendar
🌱 Growing/In Progress
📦 Harvested/Package
🍃 Leaf/Crop
📊 Statistics
👤 User/Profile
⬅️ Back Arrow

---

This visual guide shows the complete structure and flow of the Registered Farmers feature. All components maintain consistency with the existing design system while providing a comprehensive view of farmer information and crop data.
