// Hard-coded list of approved crops - Categorized to match Market Demand Forecast
export const HARDCODED_CROPS = [
    // Leafy Vegetables
    "Pechay", "Mustasa", "Lettuce", "Cabbage", "Spinach", "Pak choi",
    
    // Fruiting / Lowland Vegetables
    "Ampalaya", "Okra", "Tomato", "Upo", "Patola", "Sitaw", 
    "Beans", "Cucumber", "Squash", "Siling Labuyo", "Siling Haba", 
    "Sayote", "Labanos", "Talong", "Pipino",
    
    // High-Value / Upland Vegetables
    "Celery", "Kangkong",
    
    // Root Crops
    "Gabi", "Kamote", "Cassava", "Ube",
    
    // Grains
    "Rice",
    
    // Herbs
    "Ginger", "Turmeric"
];

// Categorized crop options for better UI organization
export const HARDCODED_CROPS_BY_CATEGORY = {
    "Leafy Vegetables": [
        "Pechay", "Mustasa", "Lettuce", "Cabbage", "Spinach", "Pak choi"
    ],
    "Fruiting / Lowland Vegetables": [
        "Ampalaya", "Okra", "Tomato", "Upo", "Patola", "Sitaw",
        "Beans", "Cucumber", "Squash", "Siling Labuyo", "Siling Haba",
        "Sayote", "Labanos", "Talong", "Pipino"
    ],
    "High-Value / Upland Vegetables": [
        "Celery", "Kangkong"
    ],
    "Root Crops": [
        "Gabi", "Kamote", "Cassava", "Ube"
    ],
    "Grains": [
        "Rice"
    ],
    "Herbs": [
        "Ginger", "Turmeric"
    ]
};

// Format crop name to have only first letter of each word capitalized
export const formatCropName = (name: string) => {
    return name
        .toLowerCase()
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};