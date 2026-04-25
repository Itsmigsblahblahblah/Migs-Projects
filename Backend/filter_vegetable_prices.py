"""Script to filter vegetable_prices.csv to only include approved crops"""
import pandas as pd
import sys

# Define approved crops mapping (old name -> new name)
APPROVED_CROPS_MAP = {
    # Leafy Vegetables
    'PECHAY, CHINESE (BOK CHOY), 1 KG': 'Pechay (Bok Choy)',
    'BOK CHOY (CHINESE CABBAGE), 1 KG': 'Pechay (Bok Choy)',
    'PECHAY (NATIVE), 1 KG': 'Pechay (Bok Choy)',
    'KANGKONG (WATER SPINACH), 1 KG': 'Kangkong (Water Spinach)',
    'MUSTASA (MUSTARD LEAVE), 1 KG': 'Mustasa (Mustard Greens)',
    'LETTUCE (LITSUGAS), 1 KG': 'Lettuce',
    'CABBAGE (REPOLYO), 1 KG': 'Cabbage',
    'REPOLYO (CABBAGE), 1 KG': 'Cabbage',
    'BAGUIO PECHAY (NAPA CABBAGE), 1 KG': 'Cabbage',
    'ALUGBATI (MALABAR SPINACH), 1 KG': 'Spinach',
    'KOLITIS/URAY (AMARANTH), 1 KG': 'Spinach',
    
    # Fruiting Vegetables
    'AMPALAYA (BITTER GOURD), 1 KG': 'Ampalaya (Bitter Gourd)',
    'OKRA, 1 KG': 'Okra',
    'KAMATIS (TOMATO), 1 KG': 'Tomato',
    'UPO (BOTTLE GOURD), 1 KG': 'Upo (Bottle Gourd)',
    'PATOLA (SPONGE GOURD), 1 KG': 'Patola (Sponge Gourd)',
    'SITAW (STRING BEAN), 1 KG': 'Sitaw (String Beans)',
    'GREEN BEANS (BAGUIO BEANS), 1 KG': 'Beans',
    'SAYOTE (CHAYOTE), 1 KG': 'Sayote',
    'LABANOS (RADISH), 1 KG': 'Labanos (Radish)',
    'TALONG (EGGPLANT), (NATIVE), 1 KG': 'Talong (Eggplant)',
    'TALONG(EGGPLANT),  (ROUND/PURPLE), 1 KG': 'Talong (Eggplant)',
    'SILING-TAMBAN (BELL PEPPER), 1 KG': 'Sweet Pepper (Bell Pepper)',
    'KALABASA (SQUASH), 1 KG': 'Squash (Kalabasa)',
    'SILING LABUYO (WILD CHILI), 1 KG': 'Chili (Siling Labuyo)',
    'SILING LABUYO (RED CHILI), 1 KG': 'Chili (Siling Labuyo)',
    'SILING-GREEN (CHILI),  (GREEN/LONG), 1 KG': 'Siling Haba',
    
    # Root Crops
    'GABI (TARRO), 1 KG': 'Gabi (Taro)',
    'GABI (TARO), 1 KG': 'Gabi (Taro)',
    'KAMOTE (SWEET POTATO), 1 KG': 'Kamote (Sweet Potato)',
    'KAMOTENG KAHOY (CASSAVA), 1 KG': 'Kamoteng Kahoy (Cassava)',
    'UBE (PURPLE YAM), 1 KG': 'Ube (Purple Yam)',
    
    # Grains
    'SINANDOMENG RICE, 1 KG': 'Rice',
    'DINORADO RICE, 1 KG': 'Rice',
    'JASMINE RICE, 1 KG': 'Rice',
    'MALAGKIT RICE, 1 KG': 'Rice',
    'MILAGROSA RICE, 1 KG': 'Rice',
    
    # Herbs
    'LUYA (GINGER), 1 KG': 'Ginger (Luya)',
    'LUYANG DILAW (TURMERIC GINGER), 1 KG': 'Luyang Dilaw (Turmeric)',
}

def filter_vegetable_prices(input_file, output_file):
    """Filter vegetable prices to only include approved crops"""
    print(f"Reading {input_file}...")
    
    # Read the CSV file - skip the header row
    df = pd.read_csv(input_file, skiprows=1, header=None)
    df.columns = ['Vegetable', 'Year', 'Month', 'Price', 'Annual Price', 'MonthNum', 'Date']
    
    print(f"Original rows: {len(df)}")
    print(f"Unique vegetables: {df['Vegetable'].nunique()}")
    
    # Debug: print first 10 unique vegetables
    print("\nFirst 10 unique vegetables:")
    for i, veg in enumerate(df['Vegetable'].unique()[:10]):
        print(f"  {i+1}. '{veg}'")
    
    # Filter and rename vegetables
    filtered_rows = []
    unmatched = set()
    
    for idx, row in df.iterrows():
        veg_name = str(row['Vegetable']).strip()
        
        # Check if this vegetable is in our approved list
        if veg_name in APPROVED_CROPS_MAP:
            new_name = APPROVED_CROPS_MAP[veg_name]
            row['Vegetable'] = new_name
            filtered_rows.append(row)
        else:
            unmatched.add(veg_name)
    
    if not filtered_rows:
        print("\nNo matches found! Checking why...")
        print(f"Sample vegetable from data: '{df['Vegetable'].iloc[0]}'")
        print(f"Type: {type(df['Vegetable'].iloc[0])}")
        print(f"\nFirst 5 keys in APPROVED_CROPS_MAP:")
        for i, key in enumerate(list(APPROVED_CROPS_MAP.keys())[:5]):
            print(f"  {i+1}. '{key}'")
        sys.exit(1)
    
    # Create new DataFrame
    new_df = pd.DataFrame(filtered_rows)
    
    print(f"Filtered rows: {len(new_df)}")
    print(f"Unique vegetables after filtering: {new_df['Vegetable'].nunique()}")
    
    # Save to new CSV
    new_df.to_csv(output_file, index=False)
    print(f"Saved filtered data to {output_file}")
    
    # Print statistics
    print("\nCrop distribution:")
    print(new_df['Vegetable'].value_counts())

if __name__ == "__main__":
    input_file = 'Data/vegetable_prices.csv'
    output_file = 'Data/vegetable_prices_filtered.csv'
    
    filter_vegetable_prices(input_file, output_file)
