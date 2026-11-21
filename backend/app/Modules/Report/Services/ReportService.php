<?php

namespace App\Modules\Report\Services;

use App\Models\InventoryStock;
use App\Models\Order;
use App\Models\Warehouse;
use App\Modules\Order\Enums\OrderStatus;
use Carbon\Carbon;

class ReportService
{
    /**
     * Executive Overview KPIs.
     */
    public function getOverviewStats(): array
    {
        $completedOrdersQuery = Order::query()->whereIn('status', [
            OrderStatus::Completed,
            OrderStatus::Delivered,
            OrderStatus::Shipped,
            OrderStatus::Processing,
            OrderStatus::Paid,
        ]);

        $totalRevenue = (float) (clone $completedOrdersQuery)->sum('grand_total');
        $totalSubtotal = (float) (clone $completedOrdersQuery)->sum('subtotal');
        $totalDiscounts = (float) (clone $completedOrdersQuery)->sum('discount_total');
        $totalOrdersCount = (int) (clone $completedOrdersQuery)->count();

        // Inventory health
        $totalPhysicalUnits = (int) InventoryStock::query()->sum('quantity_on_hand');
        $totalReservedUnits = (int) InventoryStock::query()->sum('quantity_reserved');
        $lowStockCount = InventoryStock::query()
            ->whereRaw('quantity_on_hand - quantity_reserved <= low_stock_threshold')
            ->count();

        return [
            'total_revenue' => $totalRevenue,
            'total_subtotal' => $totalSubtotal,
            'total_discounts' => $totalDiscounts,
            'total_orders' => $totalOrdersCount,
            'total_physical_units' => $totalPhysicalUnits,
            'total_reserved_units' => $totalReservedUnits,
            'low_stock_count' => $lowStockCount,
        ];
    }

    /**
     * Sales Report by Date Range.
     */
    public function getSalesMetrics(Carbon $start, Carbon $end): array
    {
        $orders = Order::query()
            ->whereBetween('created_at', [$start->startOfDay(), $end->endOfDay()])
            ->get();

        $paidOrders = $orders->filter(fn ($o) => in_array($o->status, [
            OrderStatus::Paid,
            OrderStatus::Processing,
            OrderStatus::Shipped,
            OrderStatus::Delivered,
            OrderStatus::Completed,
        ]));

        $totalRevenue = (float) $paidOrders->sum('grand_total');
        $totalDiscounts = (float) $paidOrders->sum('discount_total');
        $count = $paidOrders->count();
        $aov = $count > 0 ? round($totalRevenue / $count, 2) : 0.0;

        // Daily trend
        $dailyTrend = $paidOrders
            ->groupBy(fn ($o) => $o->created_at->format('Y-m-d'))
            ->map(fn ($group, $date) => [
                'date' => $date,
                'orders_count' => $group->count(),
                'revenue' => (float) $group->sum('grand_total'),
                'discounts' => (float) $group->sum('discount_total'),
            ])
            ->values()
            ->sortBy('date')
            ->values();

        // Status breakdown
        $statusBreakdown = $orders
            ->groupBy('status')
            ->map(fn ($group, $status) => [
                'status' => $status instanceof OrderStatus ? $status->value : (string) $status,
                'label' => $status instanceof OrderStatus ? $status->label() : (string) $status,
                'count' => $group->count(),
                'total_amount' => (float) $group->sum('grand_total'),
            ])
            ->values();

        return [
            'period_start' => $start->toDateString(),
            'period_end' => $end->toDateString(),
            'total_revenue' => $totalRevenue,
            'total_discounts' => $totalDiscounts,
            'orders_count' => $count,
            'average_order_value' => $aov,
            'daily_trend' => $dailyTrend,
            'status_breakdown' => $statusBreakdown,
        ];
    }

    /**
     * Inventory Summary & Low Stock Analysis.
     */
    public function getInventoryAnalytics(): array
    {
        $stocks = InventoryStock::query()
            ->with(['warehouse', 'variant.product'])
            ->get();

        $warehouses = Warehouse::query()->where('is_active', true)->get();

        $byWarehouse = $warehouses->map(function ($wh) use ($stocks) {
            $whStocks = $stocks->filter(fn ($s) => $s->warehouse_id === $wh->id);

            return [
                'warehouse_id' => $wh->id,
                'warehouse_name' => $wh->name,
                'warehouse_code' => $wh->code,
                'total_on_hand' => (int) $whStocks->sum('quantity_on_hand'),
                'total_reserved' => (int) $whStocks->sum('quantity_reserved'),
                'total_available' => (int) $whStocks->sum('quantity_available'),
                'variants_count' => $whStocks->count(),
            ];
        });

        // Low stock items
        $lowStockItems = $stocks
            ->filter(fn ($s) => $s->quantity_available <= $s->low_stock_threshold)
            ->map(fn ($s) => [
                'id' => $s->id,
                'product_name' => $s->variant?->product?->name ?? 'Produk',
                'sku' => $s->variant?->sku ?? '-',
                'size' => $s->variant?->size ?? '-',
                'color' => $s->variant?->color ?? '-',
                'warehouse_name' => $s->warehouse?->name ?? '-',
                'quantity_on_hand' => $s->quantity_on_hand,
                'quantity_reserved' => $s->quantity_reserved,
                'quantity_available' => $s->quantity_available,
                'threshold' => $s->low_stock_threshold,
            ])
            ->values();

        return [
            'total_units_on_hand' => (int) $stocks->sum('quantity_on_hand'),
            'total_units_available' => (int) $stocks->sum('quantity_available'),
            'total_units_reserved' => (int) $stocks->sum('quantity_reserved'),
            'by_warehouse' => $byWarehouse,
            'low_stock_items' => $lowStockItems,
        ];
    }
}
