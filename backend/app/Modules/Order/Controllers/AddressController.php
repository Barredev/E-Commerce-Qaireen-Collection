<?php

namespace App\Modules\Order\Controllers;

use App\Models\Address;
use App\Modules\Order\Requests\StoreAddressRequest;
use App\Modules\Order\Requests\UpdateAddressRequest;
use App\Modules\Order\Resources\AddressResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class AddressController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $addresses = $request->user()
            ->addresses()
            ->orderByDesc('is_default')
            ->orderByDesc('created_at')
            ->get();

        return AddressResource::collection($addresses);
    }

    public function store(StoreAddressRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();
        $isFirst = $user->addresses()->doesntExist();
        $isDefault = (bool) ($data['is_default'] ?? false) || $isFirst;

        if ($isDefault) {
            $user->addresses()->update(['is_default' => false]);
        }

        $address = $user->addresses()->create([
            ...$data,
            'is_default' => $isDefault,
        ]);

        return response()->json(
            ['data' => new AddressResource($address)],
            Response::HTTP_CREATED,
        );
    }

    public function update(UpdateAddressRequest $request, Address $address): JsonResponse
    {
        $this->ensureOwnedBy($request, $address);

        $data = $request->validated();

        if (($data['is_default'] ?? false) === true) {
            $request->user()->addresses()->whereKeyNot($address->id)->update(['is_default' => false]);
        }

        $address->update($data);

        return response()->json(['data' => new AddressResource($address->refresh())]);
    }

    public function destroy(Request $request, Address $address): JsonResponse
    {
        $this->ensureOwnedBy($request, $address);

        $wasDefault = $address->is_default;
        $address->delete();

        if ($wasDefault) {
            $request->user()
                ->addresses()
                ->orderBy('created_at')
                ->first()
                ?->update(['is_default' => true]);
        }

        return response()->json(['message' => 'Alamat berhasil dihapus.']);
    }

    private function ensureOwnedBy(Request $request, Address $address): void
    {
        abort_unless($address->user_id === $request->user()->id, 404);
    }
}
