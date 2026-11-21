<?php

namespace App\Modules\Catalog\Controllers\Admin;

use App\Models\Brand;
use App\Modules\Catalog\Requests\StoreBrandRequest;
use App\Modules\Catalog\Requests\UpdateBrandRequest;
use App\Modules\Catalog\Resources\BrandResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class BrandController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $brands = Brand::query()
            ->withCount('products')
            ->when($request->filled('q'), fn ($query) => $query->where(
                'name',
                'ilike',
                '%'.$request->string('q')->trim()->toString().'%'
            ))
            ->when($request->filled('is_active'), fn ($query) => $query->where('is_active', $request->boolean('is_active')))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(min(max($request->integer('per_page', 20), 1), 100))
            ->withQueryString();

        return BrandResource::collection($brands);
    }

    public function store(StoreBrandRequest $request): JsonResponse
    {
        $data = $request->safe()->except('slug');

        $brand = Brand::create([
            ...$data,
            'slug' => $request->input('slug') ?: Brand::generateUniqueSlug($request->string('name')->toString()),
        ]);

        return response()->json(['data' => new BrandResource($brand)], Response::HTTP_CREATED);
    }

    public function show(Brand $brand): JsonResponse
    {
        return response()->json([
            'data' => new BrandResource($brand->loadCount('products')),
        ]);
    }

    public function update(UpdateBrandRequest $request, Brand $brand): JsonResponse
    {
        $data = $request->safe()->except('slug');

        if ($request->filled('slug')) {
            $data['slug'] = $request->string('slug')->toString();
        } elseif ($request->filled('name') && $request->string('name')->toString() !== $brand->name) {
            $data['slug'] = Brand::generateUniqueSlug($request->string('name')->toString(), $brand->id);
        }

        $brand->update($data);

        return response()->json(['data' => new BrandResource($brand->refresh())]);
    }

    public function destroy(Brand $brand): JsonResponse
    {
        if ($brand->products()->exists()) {
            throw ValidationException::withMessages([
                'brand' => ['Brand tidak dapat dihapus karena masih memiliki produk.'],
            ]);
        }

        $brand->delete();

        return response()->json(['message' => 'Brand berhasil dihapus.']);
    }
}
