<?php

namespace App\Modules\Catalog\Controllers\Admin;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Modules\Catalog\Requests\StoreProductVariantRequest;
use App\Modules\Catalog\Requests\UpdateProductVariantRequest;
use App\Modules\Catalog\Resources\ProductVariantResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class ProductVariantController
{
    public function store(StoreProductVariantRequest $request, Product $product): JsonResponse
    {
        $this->ensureCombinationIsFree($product, $request->string('size')->toString(), $request->string('color')->toString());

        $variant = $product->variants()->create($request->validated());

        return response()->json(['data' => new ProductVariantResource($variant)], Response::HTTP_CREATED);
    }

    public function update(UpdateProductVariantRequest $request, Product $product, ProductVariant $variant): JsonResponse
    {
        $size = $request->filled('size') ? $request->string('size')->toString() : $variant->size;
        $color = $request->filled('color') ? $request->string('color')->toString() : $variant->color;

        $this->ensureCombinationIsFree($product, $size, $color, $variant->id);

        $variant->update($request->validated());

        return response()->json(['data' => new ProductVariantResource($variant->refresh())]);
    }

    public function destroy(Product $product, ProductVariant $variant): JsonResponse
    {
        $variant->delete();

        return response()->json(['message' => 'Varian berhasil dihapus.']);
    }

    private function ensureCombinationIsFree(Product $product, string $size, string $color, ?string $ignoreId = null): void
    {
        $exists = $product->variants()
            ->where('size', $size)
            ->where('color', $color)
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'size' => ['Kombinasi ukuran dan warna tersebut sudah ada untuk produk ini.'],
            ]);
        }
    }
}
