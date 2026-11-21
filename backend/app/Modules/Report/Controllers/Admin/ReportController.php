<?php

namespace App\Modules\Report\Controllers\Admin;

use App\Modules\Report\Services\ReportService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController
{
    public function __construct(
        private readonly ReportService $reports,
    ) {}

    public function overview(): JsonResponse
    {
        return response()->json([
            'data' => $this->reports->getOverviewStats(),
        ]);
    }

    public function sales(Request $request): JsonResponse
    {
        $start = $request->has('start_date')
            ? Carbon::parse($request->input('start_date'))
            : now()->subDays(30);

        $end = $request->has('end_date')
            ? Carbon::parse($request->input('end_date'))
            : now();

        return response()->json([
            'data' => $this->reports->getSalesMetrics($start, $end),
        ]);
    }

    public function inventory(): JsonResponse
    {
        return response()->json([
            'data' => $this->reports->getInventoryAnalytics(),
        ]);
    }
}
