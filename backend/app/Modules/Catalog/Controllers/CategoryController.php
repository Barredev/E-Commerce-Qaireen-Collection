<?php

namespace App\Modules\Catalog\Controllers;

use App\Models\Category;
use App\Modules\Catalog\Resources\CategoryResource;
use App\Modules\Catalog\Resources\ProductResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CategoryController
{
    /**
     * Return the active category tree.
     */
    public function index(): AnonymousResourceCollection
    {
        $categories = Category::query()
            ->active()
            ->roots()
            ->with(['children' => fn ($query) => $query->active()->orderBy('sort_order')])
            ->withCount(['products' => fn ($query) => $query->published()])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return CategoryResource::collection($categories);
    }

    /**
     * Show a category with its sub-categories and products.
     */
    public function show(Request $request, Category $category): JsonResponse
    {
        abort_unless($category->is_active, 404);

        $category->load(['children' => fn ($query) => $query->active()->orderBy('sort_order')]);

        $products = $category->products()
            ->published()
            ->with(['brand', 'category', 'images', 'variants'])
            ->orderByDesc('is_featured')
            ->orderByDesc('published_at')
            ->paginate(min(max($request->integer('per_page', 12), 1), 60))
            ->withQueryString();

        return response()->json([
            'data' => new CategoryResource($category),
            'products' => ProductResource::collection($products)->response()->getData(true),
        ]);
    }
}
