<?php

namespace App\Modules\Catalog\Controllers\Admin;

use App\Models\Product;
use App\Modules\Catalog\Requests\StoreProductRequest;
use App\Modules\Catalog\Requests\UpdateProductRequest;
use App\Modules\Catalog\Resources\ProductDetailResource;
use App\Modules\Catalog\Resources\ProductResource;
use App\Modules\Catalog\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ProductController
{
    public function __construct(private readonly ProductService $products) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $products = Product::query()
            ->with(['brand', 'category', 'images', 'variants'])
            ->when($request->filled('q'), fn ($query) => $query->where(
                'name',
                'ilike',
                '%'.$request->string('q')->trim().'%'
            ))
            ->when($request->filled('brand_id'), fn ($query) => $query->where('brand_id', $request->string('brand_id')))
            ->when($request->filled('category_id'), fn ($query) => $query->where('category_id', $request->string('category_id')))
            ->when($request->filled('is_active'), fn ($query) => $query->where('is_active', $request->boolean('is_active')))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(min(max($request->integer('per_page', 20), 1), 100))
            ->withQueryString();

        return ProductResource::collection($products);
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = $this->products->create($request->validated());

        return response()->json(['data' => new ProductDetailResource($product)], Response::HTTP_CREATED);
    }

    public function show(Product $product): JsonResponse
    {
        $product->load(['brand', 'category', 'variants', 'images', 'sizeGuides']);

        return response()->json(['data' => new ProductDetailResource($product)]);
    }

    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $product = $this->products->update($product, $request->validated());

        return response()->json(['data' => new ProductDetailResource($product)]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->variants()->delete();
        $product->delete();

        return response()->json(['message' => 'Produk berhasil dihapus.']);
    }
}
