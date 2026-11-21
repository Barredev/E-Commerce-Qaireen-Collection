<?php

namespace App\Modules\Order\Controllers\Admin;

use App\Models\Shipment;
use App\Modules\Order\Resources\ShipmentResource;
use App\Modules\Order\Services\ShipmentTrackingService;
use Illuminate\Http\JsonResponse;

class ShipmentController
{
    public function __construct(private readonly ShipmentTrackingService $tracking) {}

    /**
     * Pull the latest manifest for a shipment from the courier API.
     */
    public function track(Shipment $shipment): JsonResponse
    {
        $updated = $this->tracking->refreshFromProvider($shipment);

        return response()->json(['data' => new ShipmentResource($updated)]);
    }
}
