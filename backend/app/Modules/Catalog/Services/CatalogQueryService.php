<?php

namespace App\Modules\Catalog\Services;

use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class CatalogQueryService
{
    /**
     * Public catalog listing with filters and deterministic ordering.
     */
    public function paginate(Request $request): LengthAwarePaginator
    {
        $perPage = min(max($request->integer('per_page', 12), 1), 60);

        return Product::query()
            ->published()
            ->with([
                // Dimuat penuh: BrandResource/CategoryResource membaca kolom
                // seperti is_active, sort_order, dan created_at, sehingga
                // select kolom sebagian akan menghasilkan nilai palsu.
                'brand',
                'category',
                'images' => fn ($query) => $query->orderBy('sort_order'),
                'variants' => fn ($query) => $query->where('is_active', true)->orderBy('size')->orderBy('color'),
            ])
            ->when($request->filled('q'), function (Builder $query) use ($request): void {
                $term = '%'.$request->string('q')->trim()->toString().'%';
                $query->where(fn (Builder $inner) => $inner
                    ->where('name', 'ilike', $term)
                    ->orWhere('description', 'ilike', $term));
            })
            ->when($request->filled('category'), function (Builder $query) use ($request): void {
                $slug = $request->string('category')->toString();
                $query->whereHas('category', fn (Builder $category) => $category
                    ->where(fn (Builder $inner) => $inner
                        ->where('slug', $slug)
                        ->orWhereHas('parent', fn (Builder $parent) => $parent->where('slug', $slug))));
            })
            ->when($request->filled('size'), function (Builder $query) use ($request): void {
                $query->whereHas('variants', fn (Builder $variant) => $variant
                    ->where('is_active', true)
                    ->where('size', $request->string('size')->toString()));
            })
            ->when($request->filled('color'), function (Builder $query) use ($request): void {
                $query->whereHas('variants', fn (Builder $variant) => $variant
                    ->where('is_active', true)
                    ->where('color', 'ilike', $request->string('color')->toString()));
            })
            ->when($request->filled('min_price'), function (Builder $query) use ($request): void {
                $query->whereHas('variants', fn (Builder $variant) => $variant
                    ->where('price', '>=', $request->float('min_price')));
            })
            ->when($request->filled('max_price'), function (Builder $query) use ($request): void {
                $query->whereHas('variants', fn (Builder $variant) => $variant
                    ->where('price', '<=', $request->float('max_price')));
            })
            ->when($request->boolean('featured'), fn (Builder $query) => $query->where('is_featured', true))
            ->tap(fn (Builder $query) => $this->applySort($query, $request->string('sort')->toString()))
            ->paginate($perPage)
            ->withQueryString();
    }

    /**
     * @param  Builder<Product>  $query
     */
    private function applySort(Builder $query, string $sort): void
    {
        match ($sort) {
            'price_asc' => $query->orderBy(
                Product::query()
                    ->selectRaw('min(product_variants.price)')
                    ->from('product_variants')
                    ->whereColumn('product_variants.product_id', 'products.id')
                    ->whereNull('product_variants.deleted_at')
            )->orderBy('products.id'),
            'price_desc' => $query->orderByDesc(
                Product::query()
                    ->selectRaw('min(product_variants.price)')
                    ->from('product_variants')
                    ->whereColumn('product_variants.product_id', 'products.id')
                    ->whereNull('product_variants.deleted_at')
            )->orderBy('products.id'),
            'name' => $query->orderBy('products.name')->orderBy('products.id'),
            default => $query->orderByDesc('products.published_at')->orderByDesc('products.id'),
        };
    }
}
