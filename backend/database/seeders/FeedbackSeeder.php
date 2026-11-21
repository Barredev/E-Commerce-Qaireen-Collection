<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\OrderFeedback;
use App\Models\OrderReturn;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use App\Modules\Feedback\Enums\SizeFit;
use App\Modules\Order\Enums\OrderStatus;
use App\Modules\Order\Enums\ReturnReason;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;

/**
 * Backfills verified-buyer reviews over the two-year order history.
 *
 * Reviews are attached to the order line they belong to, so every row is
 * provably tied to a purchase. Ratings follow a plausible retail curve, and
 * orders that ended in a return lean negative — that correlation is what makes
 * the data worth analysing later.
 */
class FeedbackSeeder extends Seeder
{
    /**
     * Not every buyer leaves a review; roughly seven in ten do.
     */
    private const REVIEWED_ORDER_PERCENT = 70;

    /**
     * Service feedback is asked for separately, so fewer buyers fill it in.
     */
    private const FEEDBACK_ORDER_PERCENT = 55;

    private const HIDDEN_PERCENT = 1;

    private const COMMENT_PERCENT = 78;

    private const MATERIAL_RATING_PERCENT = 80;

    /**
     * @var array<string, array<int, string>>
     */
    private const COMMENTS = [
        '5' => [
            'Bahan adem dan jatuh di badan, jahitannya rapi. Puas banget belanja di sini.',
            'Kualitasnya melebihi ekspektasi, warna sesuai foto. Akan repeat order.',
            'Ukuran pas sesuai panduan, packing rapi dan cepat sampai.',
            'Suka banget sama motifnya, nyaman dipakai seharian. Recommended.',
            'Bahan tebal tapi tidak gerah, cocok untuk acara formal maupun harian.',
            'Sudah dua kali beli di sini, kualitasnya konsisten bagus.',
            'Detail jahitan rapi, tidak ada benang yang keluar. Worth it.',
        ],
        '4' => [
            'Bahan bagus dan nyaman, hanya saja warnanya sedikit lebih gelap dari foto.',
            'Jahitan rapi, ukuran pas. Pengiriman agak lama tapi barang aman.',
            'Kualitas sesuai harga, pemakaian pertama sudah nyaman.',
            'Bagus, tapi packing bisa lebih rapi lagi supaya tidak kusut.',
            'Motif cantik, hanya sedikit longgar di bagian lengan.',
            'Sesuai deskripsi, tinggal minta tambah pilihan warna lain.',
        ],
        '3' => [
            'Bahan cukup nyaman, tapi ada beberapa jahitan yang kurang rapi.',
            'Warna tidak jauh beda dari foto, sayang ukurannya agak besar.',
            'Lumayan untuk harga segini, pengiriman sesuai estimasi.',
            'Produk oke, tapi balasan chat admin agak lambat.',
            'Potongannya bagus, hanya bahannya terasa lebih tipis dari perkiraan.',
        ],
        '2' => [
            'Bahan lebih tipis dari yang saya bayangkan, agak kecewa.',
            'Ukuran jauh dari panduan, harus menukar ke ukuran lain.',
            'Warna yang datang berbeda cukup jauh dari foto di katalog.',
            'Jahitan bagian lengan kurang rapi, sayang sekali.',
        ],
        '1' => [
            'Barang datang dalam kondisi jahitan lepas, sangat mengecewakan.',
            'Ukuran tidak sesuai sama sekali dan proses retur cukup lama.',
            'Produk cacat dan tidak ada konfirmasi dari penjual sampai sekarang.',
            'Bahan sangat tipis dan terdapat noda, tidak sesuai ekspektasi.',
        ],
    ];

    /**
     * @var array<int, string>
     */
    private const SERVICE_COMMENTS = [
        'Pengiriman cepat, paket sampai dua hari lebih awal.',
        'Kurir ramah dan paket dibungkus rapi.',
        'Admin responsif saat saya tanya soal ukuran.',
        'Pengiriman agak terlambat dari estimasi, tapi barang aman.',
        'Respon admin cepat, terima kasih banyak.',
        'Packing aman, kurir juga cepat sampai.',
        'Update status pesanan jelas, tidak perlu banyak bertanya.',
        'Pelayanan baik, hanya pengiriman sempat tertahan di transit.',
    ];

    public function run(): void
    {
        if (ProductReview::query()->exists()) {
            $this->command?->warn('Ulasan produk sudah ada; seeder dilewati.');

            return;
        }

        $orders = Order::query()
            ->whereIn('status', [OrderStatus::Delivered, OrderStatus::Completed])
            ->whereNotNull('delivered_at')
            ->with(['items', 'returns.items'])
            ->orderBy('delivered_at')
            ->get();

        if ($orders->isEmpty()) {
            $this->command?->warn('Belum ada pesanan terkirim; jalankan HistoricalSeeder terlebih dahulu.');

            return;
        }

        // A soft-deleted variant still owns its order lines, so the product has
        // to be resolved through the real row rather than the default scope.
        $variants = ProductVariant::query()
            ->withTrashed()
            ->whereIn('id', $orders->flatMap(fn (Order $order) => $order->items->pluck('variant_id'))->unique()->values()->all())
            ->get()
            ->keyBy('id');

        $now = CarbonImmutable::now();
        $reviewTotal = 0;
        $feedbackTotal = 0;

        Model::unguarded(function () use ($orders, $variants, $now, &$reviewTotal, &$feedbackTotal): void {
            foreach ($orders as $order) {
                if ($order->items->isEmpty() || random_int(1, 100) > self::REVIEWED_ORDER_PERCENT) {
                    continue;
                }

                $reviewedAt = $this->reviewedAt($order, $now);
                $returnedItemIds = $order->returns
                    ->flatMap(fn (OrderReturn $return) => $return->items->pluck('order_item_id'))
                    ->all();
                $returnReason = $order->returns->first()?->reason_category;

                $ratings = [];

                foreach ($order->items as $item) {
                    $productId = $variants->get($item->variant_id)?->product_id;

                    if ($productId === null) {
                        continue;
                    }

                    $returned = in_array($item->id, $returnedItemIds, true);
                    $rating = $this->pickRating($returned);
                    $ratings[] = $rating;

                    $hiddenAt = $reviewedAt->addHours(random_int(6, 72));
                    $hidden = random_int(1, 100) <= self::HIDDEN_PERCENT;

                    ProductReview::query()->create([
                        'order_item_id' => $item->id,
                        'order_id' => $order->id,
                        'product_id' => $productId,
                        'variant_id' => $item->variant_id,
                        'user_id' => $order->user_id,
                        'rating' => $rating,
                        'comment' => $this->pickComment($rating),
                        'material_rating' => random_int(1, 100) <= self::MATERIAL_RATING_PERCENT
                            ? $this->materialRatingFor($rating)
                            : null,
                        'size_fit' => $this->pickSizeFit($returned && $returnReason === ReturnReason::SizeMismatch),
                        'is_hidden' => $hidden,
                        'hidden_at' => $hidden ? ($hiddenAt->greaterThan($now) ? $now : $hiddenAt) : null,
                        'hidden_reason' => $hidden ? 'Dilaporkan mengandung ujaran tidak pantas.' : null,
                        'created_at' => $reviewedAt,
                        'updated_at' => $reviewedAt,
                    ]);

                    $reviewTotal++;
                }

                if ($ratings === [] || random_int(1, 100) > self::FEEDBACK_ORDER_PERCENT) {
                    continue;
                }

                [$shipping, $service] = $this->serviceRatingsFor(array_sum($ratings) / count($ratings));

                OrderFeedback::query()->create([
                    'order_id' => $order->id,
                    'user_id' => $order->user_id,
                    'shipping_rating' => $shipping,
                    'service_rating' => $service,
                    'comment' => random_int(1, 100) <= 60
                        ? self::SERVICE_COMMENTS[random_int(0, count(self::SERVICE_COMMENTS) - 1)]
                        : null,
                    'created_at' => $reviewedAt,
                    'updated_at' => $reviewedAt,
                ]);

                $feedbackTotal++;
            }
        });

        $this->command?->info(sprintf(
            'Seeded %d ulasan produk dan %d feedback pesanan dari %d pesanan terkirim.',
            $reviewTotal,
            $feedbackTotal,
            $orders->count(),
        ));
    }

    /**
     * A review lands one to seven days after the parcel was received, which is
     * when a buyer actually opens the package and tries the garment on.
     */
    private function reviewedAt(Order $order, CarbonImmutable $now): CarbonImmutable
    {
        $base = $order->completed_at ?? $order->delivered_at;

        if ($base === null) {
            return $now->subMinutes(random_int(5, 120));
        }

        $moment = CarbonImmutable::instance($base)
            ->addDays(random_int(1, 7))
            ->addMinutes(random_int(0, 1439));

        return $moment->greaterThan($now) ? $now->subMinutes(random_int(5, 120)) : $moment;
    }

    private function pickRating(bool $returned): int
    {
        if ($returned) {
            return $this->weightedPick([1 => 16.0, 2 => 20.0, 3 => 34.0, 4 => 22.0, 5 => 8.0]);
        }

        return $this->weightedPick([1 => 1.0, 2 => 2.0, 3 => 12.0, 4 => 38.0, 5 => 47.0]);
    }

    /**
     * Material satisfaction tracks the overall score; a buyer who disliked the
     * garment rarely rates the fabric highly.
     */
    private function materialRatingFor(int $rating): int
    {
        return max(1, min(5, $rating + random_int(-1, 0)));
    }

    private function pickSizeFit(bool $sizeIssue): ?SizeFit
    {
        if ($sizeIssue) {
            return random_int(0, 1) === 0 ? SizeFit::TooSmall : SizeFit::TooLarge;
        }

        if (random_int(1, 100) > 85) {
            return null;
        }

        $roll = random_int(1, 100);

        if ($roll <= 78) {
            return SizeFit::Fit;
        }

        return $roll <= 92 ? SizeFit::TooSmall : SizeFit::TooLarge;
    }

    private function pickComment(int $rating): ?string
    {
        if (random_int(1, 100) > self::COMMENT_PERCENT) {
            return null;
        }

        $pool = self::COMMENTS[(string) $rating];

        return $pool[random_int(0, count($pool) - 1)];
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function serviceRatingsFor(float $average): array
    {
        if ($average >= 4.0) {
            return [random_int(4, 5), random_int(4, 5)];
        }

        if ($average >= 3.0) {
            return [random_int(3, 4), random_int(3, 5)];
        }

        return [random_int(2, 3), random_int(2, 4)];
    }

    /**
     * @param  array<int, float>  $weights
     */
    private function weightedPick(array $weights): int
    {
        $roll = random_int(1, 1000000) / 1000000 * array_sum($weights);

        foreach ($weights as $key => $weight) {
            $roll -= $weight;

            if ($roll <= 0) {
                return $key;
            }
        }

        return (int) array_key_last($weights);
    }
}
