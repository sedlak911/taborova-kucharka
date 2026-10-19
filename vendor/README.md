# Vendor data (není v gitu)

Zdrojová data pro skript `npm run build:usda`. Adresář `vendor/` je v `.gitignore`.

## Co stáhnout a kam rozbalit

- **FDC SR Legacy CSV (2018-04)** – https://fdc.nal.usda.gov/download-datasets
  → `vendor/usda/sr_legacy/*.csv` (`food.csv`, `sr_legacy_food.csv`, `food_nutrient.csv`, ...)
- **SR28 ASCII** – https://www.ars.usda.gov/ARSUserFiles/80400535/DATA/SR/sr28/dnload/sr28asc.zip
  → `vendor/usda/FOOD_DES.txt`, `vendor/usda/WEIGHT.txt`, `vendor/usda/FD_GROUP.txt` (latin-1, pole oddělená `^`)
- **open-tandoor-data** – https://github.com/TandoorRecipes/open-tandoor-data
  → `vendor/open-tandoor-data/food.json`, `conversion.json`, `property.json`

## Licence

- USDA FoodData Central / SR Legacy: CC0 (public domain)
- open-tandoor-data: ODbL / DbCL
