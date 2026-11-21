<?php

namespace App\Modules\Promotion\Controllers\Admin;

use App\Models\Promotion;
use App\Modules\Promotion\Requests\StorePromotionRequest;
use App\Modules\Promotion\Requests\UpdatePromotionRequest;
use App\Modules\Promotion\Resources\PromotionResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PromotionController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Promotion::query();

        if ($search = $request->input('q')) {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('code', 'ilike', "%{$search}%");
            });
        }

        if ($request->has('is_active') && $request->input('is_active') !== '') {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        $promotions = $query->latest()->paginate($request->integer('per_page', 15));

        return PromotionResource::collection($promotions);
    }

    public function store(StorePromotionRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['code'] = strtoupper(trim($data['code']));

        $promotion = Promotion::create($data);

        return (new PromotionResource($promotion))
            ->response()
            ->setStatusCode(201);
    }

    public function show(string $id): PromotionResource
    {
        $promotion = Promotion::findOrFail($id);

        return new PromotionResource($promotion);
    }

    public function update(UpdatePromotionRequest $request, string $id): PromotionResource
    {
        $promotion = Promotion::findOrFail($id);
        $data = $request->validated();

        if (isset($data['code'])) {
            $data['code'] = strtoupper(trim($data['code']));
        }

        $promotion->update($data);

        return new PromotionResource($promotion->fresh());
    }

    public function destroy(string $id): JsonResponse
    {
        $promotion = Promotion::findOrFail($id);
        $promotion->delete();

        return response()->json(['message' => 'Kupon promosi berhasil dihapus.']);
    }

    public function toggleActive(string $id): PromotionResource
    {
        $promotion = Promotion::findOrFail($id);
        $promotion->is_active = ! $promotion->is_active;
        $promotion->save();

        return new PromotionResource($promotion);
    }
}
