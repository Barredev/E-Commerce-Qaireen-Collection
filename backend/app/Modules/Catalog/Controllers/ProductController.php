<?php

namespace App\Modules\Catalog\Controllers;

use App\Models\Product;
use App\Modules\Catalog\Resources\ProductDetailResource;
use App\Modules\Catalog\Resources\ProductResource;
use App\Modules\Catalog\Services\CatalogQueryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController
{
    public function __construct(private readonly CatalogQueryService $catalogQuery) {}

    /**
     * Paginated catalog listing with filters.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return ProductResource::collection($this->catalogQuery->paginate($request));
    }

    /**
     * Product detail including variants, images and size guide.
     */
    public function show(Product $product): JsonResponse
    {
        abort_unless(
            $product->is_active && $product->published_at !== null && $product->published_at->isPast(),
            404
        );

        $product->load([
            'brand',
            'category',
            'variants' => fn ($query) => $query->where('is_active', true)->orderBy('size')->orderBy('color'),
            'images' => fn ($query) => $query->orderBy('sort_order'),
            'sizeGuides',
        ]);

        return response()->json(['data' => new ProductDetailResource($product)]);
    }
}
