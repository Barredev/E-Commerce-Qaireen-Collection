<?php

namespace App\Modules\Inventory\Controllers;

use App\Models\ProductVariant;
use App\Models\Warehouse;
use App\Modules\Inventory\Resources\WarehouseResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Endpoint lookup baca-saja untuk kebutuhan operasional gudang & admin
 * (daftar gudang dan pemilih varian stok).
 */
class InventoryLookupController
{
    public function warehouses(Request $request): AnonymousResourceCollection
    {
        $warehouses = Warehouse::query()
            ->when($request->filled('q'), fn ($query) => $query->where(
                fn ($inner) => $inner
                    ->where('name', 'ilike', '%'.$request->string('q')->trim().'%')
                    ->orWhere('code', 'ilike', '%'.$request->string('q')->trim().'%')
            ))
            ->when($request->filled('is_active'), fn ($query) => $query->where('is_active', $request->boolean('is_active')))
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->paginate(min(max($request->integer('per_page', 50), 1), 100))
            ->withQueryString();

        return WarehouseResource::collection($warehouses);
    }

    public function variants(Request $request): JsonResponse
    {
        $search = $request->string('q')->trim()->toString();
        $limit = min(max($request->integer('per_page', 50), 1), 100);

        $variants = ProductVariant::query()
            ->with('product:id,name,slug')
            ->whereHas('product')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($inner) use ($search): void {
                    $inner->where('sku', 'ilike', "%{$search}%")
                        ->orWhere('size', 'ilike', "%{$search}%")
                        ->orWhere('color', 'ilike', "%{$search}%")
                        ->orWhereHas('product', fn ($productQuery) => $productQuery->where('name', 'ilike', "%{$search}%"));
                });
            })
            ->orderBy('sku')
            ->limit($limit)
            ->get();

        return response()->json([
            'data' => $variants->map(fn (ProductVariant $variant) => [
                'id' => $variant->id,
                'sku' => $variant->sku,
                'size' => $variant->size,
                'color' => $variant->color,
                'label' => $variant->label(),
                'product' => $variant->product ? [
                    'id' => $variant->product->id,
                    'name' => $variant->product->name,
                    'slug' => $variant->product->slug,
                ] : null,
            ])->values(),
        ]);
    }
}
