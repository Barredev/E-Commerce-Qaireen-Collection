<?php

namespace App\Modules\Inventory\Controllers;

use App\Models\InventoryStock;
use App\Modules\Inventory\Resources\InventoryStockResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InventoryStockController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $stocks = InventoryStock::query()
            ->with(['warehouse', 'variant.product.brand'])
            ->when($request->filled('warehouse_id'), fn ($query) => $query->where('warehouse_id', $request->string('warehouse_id')))
            ->when($request->boolean('low_stock'), fn ($query) => $query->lowStock())
            ->when($request->filled('q'), fn ($query) => $query->whereHas(
                'variant',
                fn ($variant) => $variant
                    ->where('sku', 'ilike', '%'.$request->string('q')->trim().'%')
                    ->orWhereHas('product', fn ($product) => $product->where('name', 'ilike', '%'.$request->string('q')->trim().'%'))
            ))
            ->orderByDesc('updated_at')
            ->orderBy('id')
            ->paginate(min(max($request->integer('per_page', 50), 1), 100))
            ->withQueryString();

        return InventoryStockResource::collection($stocks);
    }
}
