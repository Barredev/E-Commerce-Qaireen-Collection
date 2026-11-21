<?php

namespace App\Modules\Catalog\Controllers\Admin;

use App\Models\Product;
use App\Models\ProductImage;
use App\Modules\Catalog\Resources\ProductImageResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ProductImageController
{
    public function store(Request $request, Product $product): JsonResponse
    {
        $data = Validator::make($request->all(), [
            'file' => ['nullable', 'image', 'max:5120'],
            'image_url' => ['nullable', 'string', 'max:2048', 'required_without:file'],
            'variant_id' => ['nullable', 'uuid', 'exists:product_variants,id'],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_primary' => ['boolean'],
        ])->validate();

        $imageUrl = $data['image_url'] ?? null;

        if ($request->hasFile('file')) {
            $imageUrl = Storage::disk('public')->url(
                $request->file('file')->store('products', 'public')
            );
        }

        $isPrimary = (bool) ($data['is_primary'] ?? false);

        if ($isPrimary) {
            $product->images()->update(['is_primary' => false]);
        }

        $image = $product->images()->create([
            'variant_id' => $data['variant_id'] ?? null,
            'image_url' => $imageUrl,
            'alt_text' => $data['alt_text'] ?? $product->name,
            'sort_order' => $data['sort_order'] ?? ($product->images()->max('sort_order') + 1),
            'is_primary' => $isPrimary || ! $product->images()->exists(),
        ]);

        return response()->json(['data' => new ProductImageResource($image)], Response::HTTP_CREATED);
    }

    public function destroy(Product $product, ProductImage $image): JsonResponse
    {
        $image->delete();

        return response()->json(['message' => 'Gambar berhasil dihapus.']);
    }

    public function reorder(Request $request, Product $product): JsonResponse
    {
        $data = Validator::make($request->all(), [
            'images' => ['required', 'array', 'min:1'],
            'images.*.id' => ['required', 'uuid'],
            'images.*.sort_order' => ['required', 'integer', 'min:0'],
        ])->validate();

        $ownedIds = $product->images()->pluck('id')->all();

        foreach ($data['images'] as $image) {
            if (! in_array($image['id'], $ownedIds, true)) {
                throw ValidationException::withMessages([
                    'images' => ['Terdapat gambar yang bukan milik produk ini.'],
                ]);
            }

            $product->images()->whereKey($image['id'])->update(['sort_order' => $image['sort_order']]);
        }

        return response()->json([
            'data' => ProductImageResource::collection($product->images()->orderBy('sort_order')->get()),
        ]);
    }
}
