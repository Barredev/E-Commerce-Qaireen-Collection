<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CatalogSeeder extends Seeder
{
    /**
     * Warehouses are base data: checkout resolves the receiving location from
     * the default active warehouse, so these rows must exist even when the
     * demo history is skipped.
     *
     * @var array<int, array{code: string, name: string, city: string, address: string, is_active: bool, is_default: bool}>
     */
    public const WAREHOUSES = [
        [
            'code' => 'GDG-JKT',
            'name' => 'Gudang Jakarta Pusat',
            'city' => 'Jakarta Pusat',
            'address' => 'Jl. Industri Raya No. 12, Cempaka Putih',
            'is_active' => true,
            'is_default' => true,
        ],
        [
            'code' => 'GDG-SBY',
            'name' => 'Gudang Surabaya',
            'city' => 'Surabaya',
            'address' => 'Jl. Rungkut Industri No. 45, Rungkut',
            'is_active' => true,
            'is_default' => false,
        ],
    ];

    /**
     * Category tree: parent => [children].
     * Total: 7 parents + 17 children = 24 categories (incl. original 12).
     *
     * @var array<string, list<string>>
     */
    private const CATEGORIES = [
        'Atasan' => ['Kemeja', 'Kaos', 'Blouse', 'Tank Top', 'Crop Top'],
        'Bawahan' => ['Celana Panjang', 'Rok', 'Celana Pendek', 'Kulot'],
        'Outerwear' => ['Jaket', 'Blazer', 'Cardigan', 'Hoodie'],
        'Dress' => ['Mini Dress', 'Midi Dress', 'Maxi Dress'],
        'Setelan' => ['Set Casual', 'Set Formal'],
        'Hijab & Scarf' => ['Hijab Segi Empat', 'Pashmina'],
        'Aksesoris' => ['Tas', 'Belt'],
    ];

    /**
     * Color palette with hex codes reused across products.
     *
     * @var array<string, string>
     */
    private const COLORS = [
        'Hitam' => '111111',
        'Putih' => 'FFFFFF',
        'Navy' => '1F2A44',
        'Abu' => '808080',
        'Maroon' => '6B1E2A',
        'Dusty Pink' => 'C9A0A0',
        'Olive' => '556B2F',
        'Krem' => 'E8DFC8',
        'Mocca' => '7B5B3A',
        'Sage' => 'B2BDA0',
        'Terracotta' => 'B4552D',
        'Camel' => 'C19A6B',
        'Lavender' => 'B0A4C7',
        'Burgundy' => '800020',
        'Denim' => '4F6D7A',
        'Coklat' => '5B3A29',
        'Mustard' => 'D4A017',
        'Teal' => '008080',
        'Ivory' => 'F2EAD9',
        'Merah' => 'CC2936',
    ];

    /**
     * Full catalog: 74 products across all categories.
     * ~55 active, ~19 inactive (discontinued/archived).
     *
     * Format: [name, category, price, material, sizes, colors[], is_active, is_featured, description]
     *
     * @var array<int, array{0: string, 1: string, 2: int, 3: string, 4: list<string>, 5: list<string>, 6: bool, 7: bool, 8: string}>
     */
    private const PRODUCTS = [
        // ──────────────── ORIGINAL 4 (preserved) ────────────────
        ['Kemeja Linen Minimalis', 'Kemeja', 289000, 'Linen', ['S', 'M', 'L'], ['Putih', 'Navy'], true, true, 'Kemeja linen minimalis dengan bahan berkualitas dan jahitan rapi.'],
        ['Kaos Katun Oversize', 'Kaos', 159000, 'Katun', ['S', 'M', 'L', 'XL'], ['Hitam', 'Putih'], true, true, 'Kaos katun oversize dengan bahan berkualitas dan jahitan rapi.'],
        ['Blazer Tailored', 'Blazer', 549000, 'Polyester Blend', ['M', 'L'], ['Hitam', 'Abu'], true, false, 'Blazer tailored dengan bahan berkualitas dan jahitan rapi.'],
        ['Rok Plisket', 'Rok', 219000, 'Katun', ['S', 'M'], ['Maroon', 'Hitam'], true, false, 'Rok plisket dengan bahan berkualitas dan jahitan rapi.'],

        // ──────────────── KEMEJA (5 tambahan) ────────────────
        ['Kemeja Oxford Klasik', 'Kemeja', 329000, 'Katun Oxford', ['S', 'M', 'L', 'XL'], ['Putih', 'Navy', 'Dusty Pink'], true, true, 'Kemeja oxford dengan kerah kaku dan bahan adem sepanjang hari.'],
        ['Kemeja Flanel Kotak', 'Kemeja', 269000, 'Katun Flanel', ['M', 'L', 'XL'], ['Merah', 'Navy'], true, false, 'Kemeja flanel motif kotak untuk gaya kasual sehari-hari.'],
        ['Kemeja Satin Glossy', 'Kemeja', 349000, 'Satin', ['S', 'M', 'L'], ['Hitam', 'Ivory'], true, false, 'Kemeja satin glossy dengan siluet longgar yang elegan.'],
        ['Kemeja Denim Vintage', 'Kemeja', 319000, 'Denim', ['S', 'M', 'L'], ['Denim'], false, false, 'Kemeja denim washed dengan nuansa retro yang khas.'],
        ['Kemeja Rayon Tropical', 'Kemeja', 259000, 'Rayon', ['M', 'L', 'XL'], ['Olive', 'Krem'], false, false, 'Kemeja rayon bermotif tropis untuk suasana santai.'],

        // ──────────────── KAOS (5 tambahan) ────────────────
        ['Kaos Polos Premium', 'Kaos', 129000, 'Katun 30s', ['S', 'M', 'L', 'XL'], ['Hitam', 'Putih', 'Navy', 'Abu'], true, false, 'Kaos polos premium katun 30s yang lembut dan nyaman.'],
        ['Kaos Stripe Breton', 'Kaos', 179000, 'Katun', ['S', 'M', 'L'], ['Navy', 'Hitam'], true, false, 'Kaos bergaris ala marinir Prancis yang timeless.'],
        ['Kaos Graphic Urban', 'Kaos', 169000, 'Katun Combed', ['M', 'L', 'XL'], ['Hitam', 'Putih'], true, false, 'Kaos dengan grafis urban yang bold dan eye-catching.'],
        ['Kaos Henley Klasik', 'Kaos', 189000, 'Katun Slub', ['S', 'M', 'L'], ['Krem', 'Olive'], true, false, 'Kaos henley dengan kancing sebaris untuk tampilan kasual berkelas.'],
        ['Kaos Tie Dye Festival', 'Kaos', 149000, 'Katun', ['M', 'L'], ['Lavender', 'Sage'], false, false, 'Kaos tie dye warna pastel untuk vibe festival musim panas.'],

        // ──────────────── BLOUSE (4 tambahan) ────────────────
        ['Blouse Satin Wrap', 'Blouse', 299000, 'Satin', ['S', 'M', 'L'], ['Dusty Pink', 'Ivory'], true, true, 'Blouse satin model wrap dengan detail pita di pinggang.'],
        ['Blouse Ruffle Collar', 'Blouse', 279000, 'Chiffon', ['S', 'M', 'L'], ['Putih', 'Lavender'], true, false, 'Blouse chiffon dengan kerah ruffle yang feminin.'],
        ['Blouse Off-Shoulder Boho', 'Blouse', 249000, 'Rayon', ['S', 'M'], ['Krem', 'Terracotta'], true, false, 'Blouse off-shoulder dengan bordir boho yang artistic.'],
        ['Blouse Peplum Power', 'Blouse', 319000, 'Polyester', ['S', 'M', 'L'], ['Hitam', 'Merah'], false, false, 'Blouse peplum yang memberikan siluet tegas dan powerful.'],

        // ──────────────── TANK TOP (3) ────────────────
        ['Tank Top Ribbed Basic', 'Tank Top', 99000, 'Katun Rib', ['S', 'M', 'L'], ['Hitam', 'Putih', 'Krem'], true, false, 'Tank top ribbed potongan basic untuk layering sehari-hari.'],
        ['Tank Top Halter Neck', 'Tank Top', 139000, 'Jersey', ['S', 'M'], ['Hitam', 'Dusty Pink'], true, false, 'Tank top halter neck yang sporty dan stylish.'],
        ['Tank Top Camisole Satin', 'Tank Top', 159000, 'Satin', ['S', 'M', 'L'], ['Ivory', 'Hitam'], true, false, 'Camisole satin untuk gaya elegan minimalis.'],

        // ──────────────── CROP TOP (2) ────────────────
        ['Crop Top Knit', 'Crop Top', 149000, 'Rajut', ['S', 'M'], ['Sage', 'Mocca'], true, false, 'Crop top rajut pendek untuk tampilan trendy dan playful.'],
        ['Crop Top Sporty', 'Crop Top', 129000, 'Spandex', ['S', 'M', 'L'], ['Hitam', 'Putih'], true, false, 'Crop top sporty untuk aktivitas olahraga maupun kasual.'],

        // ──────────────── CELANA PANJANG (5 tambahan) ────────────────
        ['Celana Palazzo Wide Leg', 'Celana Panjang', 289000, 'Linen', ['S', 'M', 'L'], ['Hitam', 'Krem', 'Navy'], true, true, 'Celana palazzo wide-leg berbahan linen yang elegan.'],
        ['Celana Chino Slim', 'Celana Panjang', 329000, 'Katun Twill', ['29', '30', '32', '34'], ['Hitam', 'Camel', 'Olive'], true, false, 'Celana chino slim fit dengan potongan modern dan rapi.'],
        ['Celana Jogger Street', 'Celana Panjang', 249000, 'Fleece', ['M', 'L', 'XL'], ['Hitam', 'Abu'], true, false, 'Jogger streetwear dengan detail zipper di saku.'],
        ['Celana Cargo Utilitarian', 'Celana Panjang', 359000, 'Katun Canvas', ['M', 'L', 'XL'], ['Olive', 'Hitam'], true, false, 'Celana cargo dengan saku samping fungsional.'],
        ['Celana Tailored Crease', 'Celana Panjang', 389000, 'Wool Blend', ['S', 'M', 'L'], ['Hitam', 'Abu', 'Navy'], false, false, 'Celana tailored dengan lipatan tegas untuk tampilan profesional.'],

        // ──────────────── ROK (3 tambahan) ────────────────
        ['Rok A-Line Midi', 'Rok', 249000, 'Katun', ['S', 'M', 'L'], ['Hitam', 'Navy', 'Dusty Pink'], true, false, 'Rok A-line midi yang versatile untuk segala acara.'],
        ['Rok Denim Button', 'Rok', 279000, 'Denim', ['S', 'M', 'L'], ['Denim'], true, false, 'Rok denim dengan detail kancing depan yang kasual.'],
        ['Rok Satin Slip', 'Rok', 269000, 'Satin', ['S', 'M'], ['Hitam', 'Burgundy'], false, false, 'Rok satin slip dengan potongan bias yang mewah.'],

        // ──────────────── CELANA PENDEK (3) ────────────────
        ['Celana Pendek Linen', 'Celana Pendek', 199000, 'Linen', ['S', 'M', 'L'], ['Krem', 'Putih', 'Navy'], true, false, 'Celana pendek linen adem untuk cuaca panas.'],
        ['Celana Pendek Denim Highwaist', 'Celana Pendek', 229000, 'Denim', ['S', 'M', 'L'], ['Denim', 'Hitam'], true, false, 'Celana pendek denim highwaist potongan retro.'],
        ['Celana Pendek Sport Mesh', 'Celana Pendek', 169000, 'Polyester Mesh', ['M', 'L', 'XL'], ['Hitam', 'Navy'], false, false, 'Celana pendek mesh untuk aktivitas olahraga ringan.'],

        // ──────────────── KULOT (3) ────────────────
        ['Kulot Linen Resort', 'Kulot', 269000, 'Linen', ['S', 'M', 'L'], ['Krem', 'Olive', 'Hitam'], true, false, 'Kulot linen berpotongan lebar untuk tampilan resort.'],
        ['Kulot Pleated Formal', 'Kulot', 299000, 'Polyester', ['S', 'M', 'L'], ['Hitam', 'Navy'], true, false, 'Kulot pleated yang cocok untuk ke kantor.'],
        ['Kulot Batik Print', 'Kulot', 289000, 'Katun Batik', ['M', 'L'], ['Coklat', 'Navy'], false, false, 'Kulot bermotif batik kontemporer.'],

        // ──────────────── JAKET (3 tambahan) ────────────────
        ['Jaket Denim Oversized', 'Jaket', 429000, 'Denim', ['M', 'L', 'XL'], ['Denim', 'Hitam'], true, true, 'Jaket denim oversized klasik yang tidak pernah lekang oleh waktu.'],
        ['Jaket Bomber Satin', 'Jaket', 489000, 'Satin', ['M', 'L'], ['Hitam', 'Olive'], true, false, 'Jaket bomber satin dengan detail rib di kerah dan manset.'],
        ['Jaket Parka Utility', 'Jaket', 599000, 'Katun Canvas', ['M', 'L', 'XL'], ['Olive', 'Hitam'], true, false, 'Jaket parka utility dengan hoodie dan banyak saku.'],

        // ──────────────── BLAZER (2 tambahan) ────────────────
        ['Blazer Oversized Linen', 'Blazer', 529000, 'Linen', ['S', 'M', 'L'], ['Krem', 'Hitam'], true, false, 'Blazer oversized linen untuk tampilan effortless chic.'],
        ['Blazer Double-Breasted', 'Blazer', 649000, 'Wool Blend', ['M', 'L'], ['Hitam', 'Navy'], false, false, 'Blazer double-breasted dengan kancing emas yang sophisticated.'],

        // ──────────────── CARDIGAN (2 tambahan) ────────────────
        ['Cardigan Oversized Chunky', 'Cardigan', 389000, 'Rajut Akrilik', ['M', 'L'], ['Krem', 'Mocca'], true, false, 'Cardigan chunky oversized untuk layering di musim hujan.'],
        ['Cardigan Cropped Button', 'Cardigan', 289000, 'Rajut', ['S', 'M'], ['Sage', 'Lavender'], true, false, 'Cardigan cropped dengan kancing depan yang manis.'],

        // ──────────────── HOODIE (3) ────────────────
        ['Hoodie Basic Fleece', 'Hoodie', 279000, 'Fleece', ['M', 'L', 'XL'], ['Hitam', 'Abu', 'Navy'], true, false, 'Hoodie fleece basic yang hangat dan nyaman.'],
        ['Hoodie Crop Zipper', 'Hoodie', 299000, 'Fleece', ['S', 'M', 'L'], ['Hitam', 'Dusty Pink'], true, false, 'Hoodie crop dengan zipper depan untuk tampilan sporty feminin.'],
        ['Hoodie Oversize Washed', 'Hoodie', 329000, 'Katun French Terry', ['M', 'L'], ['Abu', 'Olive'], false, false, 'Hoodie oversize dengan efek washed yang casual.'],

        // ──────────────── MINI DRESS (3) ────────────────
        ['Mini Dress Bodycon Rib', 'Mini Dress', 269000, 'Katun Rib', ['S', 'M', 'L'], ['Hitam', 'Putih', 'Dusty Pink'], true, true, 'Mini dress bodycon rib yang menonjolkan siluet tubuh.'],
        ['Mini Dress Kemeja', 'Mini Dress', 329000, 'Katun Poplin', ['S', 'M', 'L'], ['Putih', 'Navy'], true, false, 'Mini dress model kemeja yang chic dan versatile.'],
        ['Mini Dress Babydoll', 'Mini Dress', 289000, 'Rayon', ['S', 'M'], ['Sage', 'Lavender'], false, false, 'Mini dress babydoll dengan detail smock di dada.'],

        // ──────────────── MIDI DRESS (3) ────────────────
        ['Midi Dress Wrap Floral', 'Midi Dress', 389000, 'Rayon', ['S', 'M', 'L'], ['Dusty Pink', 'Navy'], true, false, 'Midi dress wrap bermotif floral yang feminin.'],
        ['Midi Dress Satin Slip', 'Midi Dress', 429000, 'Satin', ['S', 'M', 'L'], ['Hitam', 'Burgundy'], true, false, 'Midi dress satin slip dengan tali spaghetti yang mewah.'],
        ['Midi Dress Knit Turtleneck', 'Midi Dress', 369000, 'Rajut', ['M', 'L'], ['Krem', 'Hitam'], true, false, 'Midi dress rajut turtleneck untuk tampilan cozy.'],

        // ──────────────── MAXI DRESS (2) ────────────────
        ['Maxi Dress Bohemian', 'Maxi Dress', 449000, 'Rayon', ['S', 'M', 'L'], ['Terracotta', 'Ivory'], true, false, 'Maxi dress bohemian dengan detail tassel dan bordir.'],
        ['Maxi Dress One-Shoulder', 'Maxi Dress', 479000, 'Chiffon', ['S', 'M'], ['Hitam', 'Merah'], false, false, 'Maxi dress one-shoulder yang dramatis untuk pesta.'],

        // ──────────────── SET CASUAL (3) ────────────────
        ['Set Linen Resort', 'Set Casual', 459000, 'Linen', ['S', 'M', 'L'], ['Krem', 'Olive'], true, true, 'Setelan linen kemeja + celana pendek untuk tampilan resort.'],
        ['Set Knit Matching', 'Set Casual', 399000, 'Rajut', ['S', 'M'], ['Mocca', 'Sage'], true, false, 'Setelan rajut matching top + skirt yang cozy.'],
        ['Set Tie Dye Loungewear', 'Set Casual', 349000, 'Katun', ['M', 'L'], ['Lavender', 'Sage'], false, false, 'Setelan tie dye untuk santai di rumah.'],

        // ──────────────── SET FORMAL (2) ────────────────
        ['Set Blazer Power', 'Set Formal', 799000, 'Polyester Premium', ['S', 'M', 'L'], ['Hitam', 'Navy'], true, false, 'Setelan blazer + celana panjang untuk tampilan profesional.'],
        ['Set Vest Tailored', 'Set Formal', 699000, 'Wool Blend', ['M', 'L'], ['Abu', 'Hitam'], true, false, 'Setelan vest + celana tailored yang modern.'],

        // ──────────────── HIJAB SEGI EMPAT (3) ────────────────
        ['Hijab Voal Premium', 'Hijab Segi Empat', 89000, 'Voal', ['All Size'], ['Hitam', 'Navy', 'Dusty Pink', 'Sage', 'Mocca'], true, false, 'Hijab voal premium yang lembut dan mudah dibentuk.'],
        ['Hijab Polycotton', 'Hijab Segi Empat', 59000, 'Polycotton', ['All Size'], ['Hitam', 'Putih', 'Navy', 'Abu', 'Coklat'], true, false, 'Hijab polycotton yang ringan dan adem untuk sehari-hari.'],
        ['Hijab Silk Motif', 'Hijab Segi Empat', 149000, 'Silk', ['All Size'], ['Dusty Pink', 'Teal', 'Burgundy'], false, false, 'Hijab silk bermotif eksklusif edisi terbatas.'],

        // ──────────────── PASHMINA (2) ────────────────
        ['Pashmina Diamond', 'Pashmina', 79000, 'Diamond Italiano', ['All Size'], ['Hitam', 'Navy', 'Krem', 'Mocca'], true, false, 'Pashmina diamond italiano yang versatile untuk segala gaya.'],
        ['Pashmina Plisket', 'Pashmina', 99000, 'Polyester', ['All Size'], ['Hitam', 'Dusty Pink', 'Sage'], true, false, 'Pashmina plisket yang praktis tanpa perlu dilipat ulang.'],

        // ──────────────── TAS (3) ────────────────
        ['Tote Bag Canvas Minimalis', 'Tas', 189000, 'Canvas', ['All Size'], ['Hitam', 'Krem', 'Navy'], true, false, 'Tote bag canvas minimalis untuk gaya kasual sehari-hari.'],
        ['Sling Bag Kulit Sintetis', 'Tas', 259000, 'PU Leather', ['All Size'], ['Hitam', 'Camel', 'Mocca'], true, false, 'Sling bag kulit sintetis premium dengan detail zipper emas.'],
        ['Clutch Pesta Satin', 'Tas', 229000, 'Satin', ['All Size'], ['Hitam', 'Burgundy', 'Ivory'], false, false, 'Clutch satin mungil untuk acara formal dan pesta.'],

        // ──────────────── BELT (2) ────────────────
        ['Belt Kulit Classic', 'Belt', 149000, 'Kulit Sintetis', ['S', 'M', 'L'], ['Hitam', 'Coklat'], true, false, 'Belt kulit klasik dengan gesper silver untuk tampilan rapi.'],
        ['Belt Chain Fashion', 'Belt', 129000, 'Metal & PU', ['All Size'], ['Hitam', 'Camel'], false, false, 'Belt rantai fashion untuk aksen di pinggang.'],
    ];

    public function run(): void
    {
        $this->seedWarehouses();

        $categoryModels = $this->seedCategories();

        $ownBrand = Brand::query()->firstOrCreate(
            ['slug' => 'qaireen-collection'],
            [
                'name' => 'Qaireen Collection',
                'description' => 'Identitas toko Qaireen Collection untuk seluruh katalog.',
                'is_active' => true,
                'sort_order' => 1,
            ],
        );

        $this->seedProducts($categoryModels, $ownBrand);
    }

    /**
     * @return array<string, Category>
     */
    private function seedCategories(): array
    {
        $models = [];
        $parentOrder = 0;

        foreach (self::CATEGORIES as $parentName => $children) {
            $parent = Category::query()->firstOrCreate(
                ['slug' => str()->slug($parentName)],
                [
                    'name' => $parentName,
                    'is_active' => true,
                    'sort_order' => $parentOrder++,
                ],
            );

            $models[$parentName] = $parent;

            $childOrder = 0;

            foreach ($children as $childName) {
                $models[$childName] = Category::query()->firstOrCreate(
                    ['slug' => str()->slug($childName)],
                    [
                        'name' => $childName,
                        'parent_id' => $parent->id,
                        'is_active' => true,
                        'sort_order' => $childOrder++,
                    ],
                );
            }
        }

        return $models;
    }

    /**
     * @param  array<string, Category>  $categories
     */
    private function seedProducts(array $categories, Brand $brand): void
    {
        $colorMap = self::COLORS;

        foreach (self::PRODUCTS as $index => $definition) {
            [$name, $categoryName, $price, $material, $sizes, $colors, $isActive, $isFeatured, $description] = $definition;

            $category = $categories[$categoryName] ?? null;

            $product = Product::query()->firstOrCreate(
                ['slug' => Str::slug($name)],
                [
                    'brand_id' => $brand->id,
                    'category_id' => $category?->id,
                    'name' => $name,
                    'description' => $description,
                    'material' => $material,
                    'care_instructions' => 'Cuci dengan air dingin, jangan gunakan pemutih.',
                    'base_price' => $price,
                    'is_active' => $isActive,
                    'is_featured' => $isFeatured,
                    'published_at' => now()->subDays(count(self::PRODUCTS) - $index),
                ],
            );

            foreach ($sizes as $size) {
                foreach ($colors as $color) {
                    $hex = isset($colorMap[$color]) ? '#'.$colorMap[$color] : null;

                    ProductVariant::query()->firstOrCreate(
                        ['sku' => $this->variantSku($name, $size, $color)],
                        [
                            'product_id' => $product->id,
                            'size' => $size,
                            'color' => $color,
                            'color_hex' => $hex,
                            'price' => $price,
                            'weight_grams' => $this->guessWeight($categoryName),
                            'is_active' => $isActive,
                        ],
                    );
                }
            }
        }
    }

    private function variantSku(string $productName, string $size, string $color): string
    {
        return Str::upper(Str::slug($productName)).'-'.$size.'-'.Str::upper(Str::slug($color));
    }

    /**
     * Estimate weight in grams based on category.
     */
    private function guessWeight(string $category): int
    {
        return match ($category) {
            'Hijab Segi Empat', 'Pashmina' => 80,
            'Belt', 'Belt Chain Fashion' => 120,
            'Tas' => 400,
            'Kaos', 'Tank Top', 'Crop Top' => 200,
            'Kemeja', 'Blouse' => 250,
            'Rok', 'Celana Pendek', 'Kulot' => 300,
            'Celana Panjang' => 400,
            'Jaket', 'Blazer', 'Hoodie' => 500,
            'Cardigan' => 350,
            'Mini Dress', 'Midi Dress' => 350,
            'Maxi Dress' => 450,
            'Set Casual', 'Set Formal' => 600,
            default => 300,
        };
    }

    private function seedWarehouses(): void
    {
        foreach (self::WAREHOUSES as $definition) {
            Warehouse::query()->firstOrCreate(
                ['code' => $definition['code']],
                $definition,
            );
        }
    }
}
