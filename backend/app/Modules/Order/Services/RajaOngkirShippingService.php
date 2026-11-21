<?php

namespace App\Modules\Order\Services;

use App\Modules\Order\Contracts\ShippingProviderInterface;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * RajaOngkir Pro client for realtime courier tariffs and waybill tracking.
 *
 * When no API key/origin is configured the service answers from a
 * deterministic tariff table so checkout, tests, and demos keep working
 * without network access.
 */
class RajaOngkirShippingService implements ShippingProviderInterface
{
    /**
     * Per-kilogram tariff table used while the API is not configured.
     *
     * @var array<string, array<string, int>>
     */
    private const SIMULATED_TARIFFS = [
        'jne' => ['REG' => 9000, 'YES' => 16000],
        'sicepat' => ['REG' => 8500, 'BEST' => 15000],
        'jnt' => ['EZ' => 8000, 'YES' => 14000],
    ];

    /**
     * @var array<string, string>
     */
    private const COURIER_NAMES = [
        'jne' => 'JNE',
        'sicepat' => 'SiCepat',
        'jnt' => 'J&T',
    ];

    private string $apiKey;

    private string $baseUrl;

    private string $originId;

    /**
     * @var array<int, string>
     */
    private array $couriers;

    private bool $simulated;

    public function __construct()
    {
        $this->apiKey = (string) config('services.rajaongkir.key', '');
        $this->baseUrl = rtrim((string) config('services.rajaongkir.base_url', ''), '/');
        $this->originId = (string) config('services.rajaongkir.origin_id', '');
        $this->couriers = array_values((array) config('services.rajaongkir.couriers', []));
        $this->simulated = (bool) config('services.rajaongkir.simulation', false);
    }

    public function isSimulationMode(): bool
    {
        return $this->simulated
            || empty($this->apiKey)
            || empty($this->originId)
            || str_starts_with($this->apiKey, 'demo');
    }

    /**
     * @return array<int, string>
     */
    public function supportedCouriers(): array
    {
        return $this->couriers;
    }

    public function courierName(string $code): string
    {
        return self::COURIER_NAMES[strtolower($code)] ?? strtoupper($code);
    }

    /**
     * @return array<int, array{
     *     code: string,
     *     name: string,
     *     service: string,
     *     description: string,
     *     cost: float,
     *     etd: string|null
     * }>
     */
    public function rates(string $destinationId, int $weightGrams, ?string $courier = null): array
    {
        $couriers = $this->courierList($courier);
        $weightGrams = max(1, $weightGrams);

        if ($this->isSimulationMode()) {
            return $this->simulatedRates($couriers, $weightGrams);
        }

        try {
            $response = $this->client()
                ->asForm()
                ->post($this->baseUrl.'/cost', [
                    'origin' => $this->originId,
                    'destination' => $destinationId,
                    'weight' => $weightGrams,
                    'courier' => implode(':', $couriers),
                ]);

            if (! $response->successful()) {
                Log::error('RajaOngkir Cost Error', [
                    'status' => $response->status(),
                    'response' => $response->body(),
                    'destination' => $destinationId,
                ]);

                return [];
            }

            return $this->mapRates($response->json('rajaongkir.results'));
        } catch (\Throwable $exception) {
            Log::error('RajaOngkir Cost Exception: '.$exception->getMessage(), [
                'destination' => $destinationId,
                'weight' => $weightGrams,
            ]);

            return [];
        }
    }

    /**
     * @return array{
     *     status: string,
     *     history: array<int, array{status: string|null, description: string, occurred_at: string|null}>,
     *     is_simulated: bool
     * }
     */
    public function track(string $courierCode, string $trackingNumber): array
    {
        if ($this->isSimulationMode()) {
            return ['status' => 'pending', 'history' => [], 'is_simulated' => true];
        }

        try {
            $response = $this->client()
                ->asForm()
                ->post($this->baseUrl.'/waybill', [
                    'waybill' => $trackingNumber,
                    'courier' => strtolower($courierCode),
                ]);

            if (! $response->successful()) {
                Log::error('RajaOngkir Waybill Error', [
                    'status' => $response->status(),
                    'response' => $response->body(),
                    'tracking_number' => $trackingNumber,
                ]);

                return ['status' => 'pending', 'history' => [], 'is_simulated' => false];
            }

            $result = (array) $response->json('rajaongkir.result', []);

            return [
                'status' => (string) ($result['status']['status'] ?? 'pending'),
                'history' => $this->mapManifest($result['manifest'] ?? []),
                'is_simulated' => false,
            ];
        } catch (\Throwable $exception) {
            Log::error('RajaOngkir Waybill Exception: '.$exception->getMessage(), [
                'tracking_number' => $trackingNumber,
            ]);

            return ['status' => 'pending', 'history' => [], 'is_simulated' => false];
        }
    }

    /**
     * @return array<int, array{id: string, name: string, province: string, type: string}>
     */
    public function destinations(string $search): array
    {
        $needle = strtolower(trim($search));

        if ($this->isSimulationMode()) {
            return $this->simulatedDestinations($needle);
        }

        try {
            $response = $this->client()->get($this->baseUrl.'/city');

            if (! $response->successful()) {
                Log::error('RajaOngkir City Error', [
                    'status' => $response->status(),
                    'response' => $response->body(),
                ]);

                return [];
            }

            $cities = (array) $response->json('rajaongkir.results', []);
            $matches = [];

            foreach ($cities as $city) {
                if (! is_array($city)) {
                    continue;
                }

                $name = (string) ($city['city_name'] ?? '');
                $province = (string) ($city['province'] ?? '');

                if ($needle !== '' && ! str_contains(strtolower($name), $needle)) {
                    continue;
                }

                $matches[] = [
                    'id' => (string) ($city['city_id'] ?? ''),
                    'name' => $name,
                    'province' => $province,
                    'type' => (string) ($city['type'] ?? ''),
                ];
            }

            return array_slice($matches, 0, 25);
        } catch (\Throwable $exception) {
            Log::error('RajaOngkir City Exception: '.$exception->getMessage(), ['search' => $search]);

            return [];
        }
    }

    /**
     * @return array<int, array{id: string, name: string, province: string, type: string}>
     */
    private function simulatedDestinations(string $needle): array
    {
        $cities = [
            ['id' => '152', 'name' => 'Jakarta Selatan', 'province' => 'DKI Jakarta', 'type' => 'Kota'],
            ['id' => '151', 'name' => 'Jakarta Pusat', 'province' => 'DKI Jakarta', 'type' => 'Kota'],
            ['id' => '23', 'name' => 'Bandung', 'province' => 'Jawa Barat', 'type' => 'Kota'],
            ['id' => '444', 'name' => 'Surabaya', 'province' => 'Jawa Timur', 'type' => 'Kota'],
            ['id' => '501', 'name' => 'Yogyakarta', 'province' => 'DI Yogyakarta', 'type' => 'Kota'],
        ];

        return array_values(array_filter(
            $cities,
            fn (array $city): bool => $needle === '' || str_contains(strtolower($city['name']), $needle),
        ));
    }

    private function client(): PendingRequest
    {
        return Http::acceptJson()
            ->withHeaders(['key' => $this->apiKey])
            ->connectTimeout(5)
            ->timeout(15);
    }

    /**
     * @return array<int, string>
     */
    private function courierList(?string $courier): array
    {
        $requested = strtolower(trim((string) $courier));

        if ($requested !== '') {
            return [$requested];
        }

        return $this->couriers === [] ? array_keys(self::SIMULATED_TARIFFS) : $this->couriers;
    }

    /**
     * @param  array<int, string>  $couriers
     * @return array<int, array{
     *     code: string,
     *     name: string,
     *     service: string,
     *     description: string,
     *     cost: float,
     *     etd: string|null
     * }>
     */
    private function simulatedRates(array $couriers, int $weightGrams): array
    {
        $kilograms = max(1, (int) ceil($weightGrams / 1000));
        $quotes = [];

        foreach ($couriers as $code) {
            foreach (self::SIMULATED_TARIFFS[$code] ?? [] as $service => $tariff) {
                $quotes[] = [
                    'code' => $code,
                    'name' => $this->courierName($code),
                    'service' => $service,
                    'description' => $this->serviceDescription($service),
                    'cost' => (float) ($tariff * $kilograms),
                    'etd' => '2-3 hari',
                ];
            }
        }

        usort($quotes, fn (array $left, array $right): int => $left['cost'] <=> $right['cost']);

        return $quotes;
    }

    /**
     * @return array<int, array{
     *     code: string,
     *     name: string,
     *     service: string,
     *     description: string,
     *     cost: float,
     *     etd: string|null
     * }>
     */
    private function mapRates(mixed $results): array
    {
        if (! is_array($results)) {
            return [];
        }

        $quotes = [];

        foreach ($results as $result) {
            if (! is_array($result)) {
                continue;
            }

            $code = strtolower((string) ($result['code'] ?? ''));

            foreach ((array) ($result['costs'] ?? []) as $cost) {
                $service = (string) ($cost['service'] ?? '');
                $first = (array) (($cost['cost'][0] ?? []) ?: []);
                $etd = isset($first['etd']) && $first['etd'] !== '' ? (string) $first['etd'] : null;

                $quotes[] = [
                    'code' => $code,
                    'name' => (string) ($result['name'] ?? $this->courierName($code)),
                    'service' => $service,
                    'description' => (string) ($cost['description'] ?? $this->serviceDescription($service)),
                    'cost' => (float) ($first['value'] ?? 0),
                    'etd' => $etd,
                ];
            }
        }

        usort($quotes, fn (array $left, array $right): int => $left['cost'] <=> $right['cost']);

        return $quotes;
    }

    /**
     * @return array<int, array{status: string|null, description: string, occurred_at: string|null}>
     */
    private function mapManifest(mixed $manifest): array
    {
        if (! is_array($manifest)) {
            return [];
        }

        $history = [];

        foreach ($manifest as $entry) {
            if (! is_array($entry)) {
                continue;
            }

            $history[] = [
                'status' => null,
                'description' => trim((string) ($entry['manifest_description'] ?? '')),
                'occurred_at' => $this->manifestTimestamp($entry),
            ];
        }

        return $history;
    }

    /**
     * @param  array<string, mixed>  $entry
     */
    private function manifestTimestamp(array $entry): ?string
    {
        $date = trim((string) ($entry['manifest_date'] ?? ''));
        $time = trim((string) ($entry['manifest_time'] ?? ''));

        if ($date === '') {
            return null;
        }

        try {
            return Carbon::parse(trim($date.' '.$time))->toIso8601String();
        } catch (\Throwable) {
            return null;
        }
    }

    private function serviceDescription(string $service): string
    {
        return match (strtoupper($service)) {
            'REG' => 'Reguler',
            'YES' => 'Yakin Esok Sampai',
            'BEST' => 'Best Service',
            'EZ' => 'Reguler Ekonomis',
            default => 'Layanan '.$service,
        };
    }
}
