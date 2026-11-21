<?php

namespace App\Modules\Catalog\Controllers\Admin;

use App\Models\Category;
use App\Modules\Catalog\Requests\StoreCategoryRequest;
use App\Modules\Catalog\Requests\UpdateCategoryRequest;
use App\Modules\Catalog\Resources\CategoryResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class CategoryController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Category::query()
            ->withCount('products')
            ->when($request->filled('q'), fn ($builder) => $builder->where(
                'name',
                'ilike',
                '%'.$request->string('q')->trim().'%'
            ))
            ->when($request->filled('is_active'), fn ($builder) => $builder->where('is_active', $request->boolean('is_active')));

        if ($request->boolean('tree')) {
            $categories = $query
                ->roots()
                ->with(['children' => fn ($builder) => $builder->withCount('products')->orderBy('sort_order')])
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get();

            return CategoryResource::collection($categories);
        }

        $categories = $query
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(min(max($request->integer('per_page', 50), 1), 100))
            ->withQueryString();

        return CategoryResource::collection($categories);
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $category = Category::create([
            ...$request->safe()->except('slug'),
            'slug' => $request->input('slug') ?: Category::generateUniqueSlug($request->string('name')->toString()),
        ]);

        return response()->json(['data' => new CategoryResource($category)], Response::HTTP_CREATED);
    }

    public function show(Category $category): JsonResponse
    {
        $category->load(['children' => fn ($query) => $query->withCount('products')->orderBy('sort_order')])
            ->loadCount('products');

        return response()->json(['data' => new CategoryResource($category)]);
    }

    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        $data = $request->safe()->except('slug');

        if ($request->filled('slug')) {
            $data['slug'] = $request->string('slug')->toString();
        } elseif ($request->filled('name') && $request->string('name')->toString() !== $category->name) {
            $data['slug'] = Category::generateUniqueSlug($request->string('name')->toString(), $category->id);
        }

        $category->update($data);

        return response()->json(['data' => new CategoryResource($category->refresh())]);
    }

    public function destroy(Category $category): JsonResponse
    {
        if ($category->children()->exists() || $category->products()->exists()) {
            throw ValidationException::withMessages([
                'category' => ['Kategori tidak dapat dihapus karena masih memiliki sub-kategori atau produk.'],
            ]);
        }

        $category->delete();

        return response()->json(['message' => 'Kategori berhasil dihapus.']);
    }
}
