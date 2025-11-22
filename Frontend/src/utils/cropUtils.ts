// Hard-coded list of exactly 66 crops from the Market Demand Forecast page
export const HARDCODED_CROPS = [
    "Repolyo (Cabbage)", "Koliflower (Cauliflower)", "Banana Blossom (Puso Ng Saging)", "Alugbati (Malabar Spinach)",
    "Talbos Ng Kamote (Camote Tops)", "Dahon Ng Sayote (Chayote Leaves)", "Gabi Leaves (Dahon Ng Gabi)", "Kangkong (Water Spinach)",
    "Malunggay (Moringa)", "Bok Choy (Chinese Cabbage)", "Pechay (Native)", "Dahon Ng Sibuyas (Onion Leaves)",
    "Siling Labuyo (Wild Chili)", "Sibuyas (Onion)", "Labanos (Radish)", "Sitaw (String Bean)",
    "Ampalaya (Bitter Gourd)", "Upo (Bottle Gourd)", "Talong (Eggplant - Native)", "Luya (Ginger)",
    "Bawang (Garlic)", "Kamatis (Tomato)", "Karot (Carrot)", "Brokoli (Broccoli)",
    "Singkamas (Jicama)", "Sibuyas Na Puti (White Onion)", "Baguio Pechay (Napa Cabbage)", "Mustasa (Mustard Leave)",
    "Sayote (Chayote)", "Kalabasa (Squash)", "Bulaklak Ng Kalabasa (Squash Blossom)", "Okra (Lady's Finger)",
    "Luyang Dilaw (Turmeric Ginger)", "Siling Haba (Long Chili)", "Sampaloc (Tamarind)", "Talong (Eggplant - Round)",
    "Patola (Sponge Gourd)", "Patani (Lima Bean)", "Saluyot (Jute Mallow)", "Kadyos (Pigeon Bean)",
    "Bataw (Hyacinth Bean)", "Kamoteng Kahoy (Cassava)", "Gabi (Tarro)", "Siling-Tamban (Bell Pepper)",
    "Patatas (Potato)", "Litsugas (Lettuce)", "Green Beans (Baguio Beans)", "Siling Labuyo (Red Chili)",
    "Kolitis/Uray (Amaranth)", "Togue (Bean Sprouts)", "Pako (Fiddlehead Fern)", "Mushroom (Oyster/Fresh)",
    "Tanglad (Lemon Grass)", "Kutsay (Chives)", "Labong (Bamboo Shoot)", "Araru (Arrowroot)",
    "Kamote (Sweet Potato)", "Gabi (Taro)", "Ube (Purple Yam)", "Sinandomeng Rice",
    "Dinorado Rice", "Jasmine Rice", "Malagkit (Sticky Rice)", "Milagrosa Rice",
    "Pinawa (Brown Rice)", "Pulang Bigas (Red Rice)"
];

// Format crop name to have only first letter of each word capitalized
export const formatCropName = (name: string) => {
    return name
        .toLowerCase()
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};