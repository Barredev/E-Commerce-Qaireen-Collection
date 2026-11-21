<?php

namespace App\Modules\Inventory\Controllers;

use App\Models\Warehouse;
use App\Modules\Inventory\Requests\StoreWarehouseRequest;
use App\Modules\Inventory\Requests\UpdateWarehouseRequest;
use App\Modules\Inventory\Resources\WarehouseResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class WarehouseController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $warehouses = Warehouse::query()
            ->withCount('stocks')
            ->when($request->filled('q'), fn ($query) => $query->where(
                fn ($inner) => $inner
                    ->where('name', 'ilike', '%'.$request->string('q')->trim().'%')
                    ->orWhere('code', 'ilike', '%'.$request->string('q')->trim().'%')
            ))
            ->when($request->filled('is_active'), fn ($query) => $query->where('is_active', $request->boolean('is_active')))
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->paginate(min(max($request->integer('per_page', 20), 1), 100))
            ->withQueryString();

        return WarehouseResource::collection($warehouses);
    }

    public function store(StoreWarehouseRequest $request): JsonResponse
    {
        $warehouse = Warehouse::query()->create($request->validated());

        if ($request->boolean('is_default') || Warehouse::query()->where('is_default', true)->doesntExist()) {
            $warehouse->makeDefault();
        }

        return response()->json(
            ['data' => new WarehouseResource($warehouse->refresh()->loadCount('stocks'))],
            Response::HTTP_CREATED,
        );
    }

    public function show(Warehouse $warehouse): JsonResponse
    {
        return response()->json([
            'data' => new WarehouseResource($warehouse->loadCount('stocks')),
        ]);
    }

    public function update(UpdateWarehouseRequest $request, Warehouse $warehouse): JsonResponse
    {
        $warehouse->update($request->validated());

        if ($request->boolean('is_default')) {
            $warehouse->makeDefault();
        }

        return response()->json([
            'data' => new WarehouseResource($warehouse->refresh()->loadCount('stocks')),
        ]);
    }

    public function destroy(Warehouse $warehouse): JsonResponse
    {
        if ($warehouse->stocks()->exists() || $warehouse->receipts()->exists()) {
            throw ValidationException::withMessages([
                'warehouse' => ['Gudang tidak dapat dihapus karena masih memiliki data stok atau penerimaan.'],
            ]);
        }

        $warehouse->delete();

        return response()->json(['message' => 'Gudang berhasil dihapus.']);
    }

    public function makeDefault(Warehouse $warehouse): JsonResponse
    {
        $warehouse->makeDefault();

        return response()->json([
            'data' => new WarehouseResource($warehouse->refresh()->loadCount('stocks')),
        ]);
    }
}
