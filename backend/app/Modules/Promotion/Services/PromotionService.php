<?php

namespace App\Modules\Promotion\Services;

use App\Models\Cart;
use App\Models\Order;
use App\Models\Promotion;
use App\Models\User;
use App\Modules\Promotion\Enums\PromotionAppliesTo;
use App\Modules\Promotion\Enums\PromotionType;
use Illuminate\Validation\ValidationException;

class PromotionService
{
    /**
     * Validate coupon against cart and calculate exact discount amount.
     */
    public function validateAndCalculate(string $code, Cart $cart, ?User $user = null): array
    {
        $normalizedCode = strtoupper(trim($code));

        /** @var Promotion|null $promo */
        $promo = Promotion::query()
            ->whereRaw('UPPER(code) = ?', [$normalizedCode])
            ->first();

        if (! $promo) {
            throw ValidationException::withMessages([
                'coupon_code' => ['Kode kupon tidak valid atau tidak ditemukan.'],
            ]);
        }

        if (! $promo->is_active) {
            throw ValidationException::withMessages([
                'coupon_code' => ['Kupon ini sudah tidak aktif.'],
            ]);
        }

        $now = now();
        if ($promo->starts_at && $now->lt($promo->starts_at)) {
            throw ValidationException::withMessages([
                'coupon_code' => ['Periode promo kupon ini belum dimulai.'],
            ]);
        }

        if ($promo->ends_at && $now->gt($promo->ends_at)) {
            throw ValidationException::withMessages([
                'coupon_code' => ['Masa berlaku kupon ini sudah berakhir.'],
            ]);
        }

        if ($promo->usage_limit !== null && $promo->usage_count >= $promo->usage_limit) {
            throw ValidationException::withMessages([
                'coupon_code' => ['Kuota pemakaian kupon ini telah habis.'],
            ]);
        }

        // Check per-user limit
        if ($user && $promo->per_user_limit > 0) {
            $userUsage = Order::query()
                ->where('user_id', $user->id)
                ->where('coupon_code', $promo->code)
                ->whereNotIn('status', ['cancelled'])
                ->count();

            if ($userUsage >= $promo->per_user_limit) {
                throw ValidationException::withMessages([
                    'coupon_code' => ['Anda telah mencapai batas maksimum pemakaian kupon ini.'],
                ]);
            }
        }

        $cart->loadMissing(['items.variant.product.category', 'items.variant.product.brand']);

        $cart->loadMissing(['items.variant.product']);
        $items = $cart->items;
        if ($items->isEmpty()) {
            throw ValidationException::withMessages([
                'coupon_code' => ['Keranjang belanja kosong.'],
            ]);
        }

        // Calculate qualifying subtotal
        $applicableIds = $promo->applicable_ids ?? [];
        $qualifyingSubtotal = 0.0;

        foreach ($items as $item) {
            $product = $item->variant?->product;
            if (! $product) {
                continue;
            }

            $matches = match ($promo->applies_to) {
                PromotionAppliesTo::All => true,
                PromotionAppliesTo::Category => in_array($product->category_id, $applicableIds, true),
                PromotionAppliesTo::Product => in_array($product->id, $applicableIds, true),
            };

            if ($matches) {
                $unitPrice = (float) ($item->unit_price ?? $item->variant?->price ?? 0);
                $qualifyingSubtotal += $unitPrice * $item->quantity;
            }
        }

        if ($qualifyingSubtotal <= 0) {
            throw ValidationException::withMessages([
                'coupon_code' => ['Kupon tidak berlaku untuk produk yang ada di keranjang Anda.'],
            ]);
        }

        if ($promo->min_purchase !== null && $qualifyingSubtotal < $promo->min_purchase) {
            throw ValidationException::withMessages([
                'coupon_code' => [
                    sprintf('Minimal belanja untuk kupon ini adalah Rp %s.', number_format($promo->min_purchase, 0, ',', '.')),
                ],
            ]);
        }

        $discount = 0.0;
        if ($promo->type === PromotionType::Percentage) {
            $discount = $qualifyingSubtotal * ($promo->value / 100);
            if ($promo->max_discount !== null && $discount > $promo->max_discount) {
                $discount = (float) $promo->max_discount;
            }
        } elseif ($promo->type === PromotionType::FixedAmount) {
            $discount = min((float) $promo->value, $qualifyingSubtotal);
        } elseif ($promo->type === PromotionType::FreeShipping) {
            // Free shipping flag - discount handled on shipping component
            $discount = 0.0;
        }

        return [
            'id' => $promo->id,
            'name' => $promo->name,
            'code' => $promo->code,
            'type' => $promo->type->value,
            'type_label' => $promo->type->label(),
            'value' => $promo->value,
            'discount_amount' => round($discount, 2),
            'discount_bearer' => $promo->discount_bearer->value,
            'discount_bearer_label' => $promo->discount_bearer->label(),
            'is_free_shipping' => $promo->type === PromotionType::FreeShipping,
            'message' => 'Kupon berhasil diterapkan!',
        ];
    }

    /**
     * Record coupon usage after order is successfully placed.
     */
    public function recordUsage(string $code): void
    {
        Promotion::query()
            ->whereRaw('UPPER(code) = ?', [strtoupper(trim($code))])
            ->increment('usage_count');
    }
}
