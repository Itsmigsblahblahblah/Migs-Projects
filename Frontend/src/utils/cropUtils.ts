// Hard-coded list of approved crops (31 unique crops)
export const HARDCODED_CROPS = [
    // Leafy Vegetables
    "Pechay (Bok Choy)", "Kangkong (Water Spinach)", "Mustasa (Mustard Greens)", 
    "Lettuce", "Cabbage", "Spinach", "Pak Choi",
    
    // Fruiting / Lowland Vegetables
    "Ampalaya (Bitter Gourd)", "Okra", "Tomato", "Upo (Bottle Gourd)", 
    "Patola (Sponge Gourd)", "Sitaw (String Beans)", "Beans", "Cucumber", 
    "Squash (Kalabasa)", "Chili (Siling Labuyo)", "Siling Haba", "Sayote", 
    "Labanos (Radish)", "Talong (Eggplant)", "Sweet Pepper (Bell Pepper)",
    
    // High-Value / Upland Vegetables
    "Celery",
    
    // Root Crops
    "Gabi (Taro)", "Kamote (Sweet Potato)", "Kamoteng Kahoy (Cassava)", "Ube (Purple Yam)",
    
    // Grains
    "Rice",
    
    // Herbs
    "Ginger (Luya)", "Luyang Dilaw (Turmeric)"
];

// Format crop name to have only first letter of each word capitalized
export const formatCropName = (name: string) => {
    return name
        .toLowerCase()
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};