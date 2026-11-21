<?php

namespace App\Modules\Catalog\Concerns;

use Illuminate\Support\Str;

trait GeneratesSlug
{
    /**
     * Build a slug that is unique for this model's table.
     *
     * @param  string  $source  Raw text to slugify (usually the model name).
     * @param  string|null  $ignoreId  Primary key to exclude from the uniqueness check.
     */
    protected static function generateUniqueSlug(string $source, ?string $ignoreId = null): string
    {
        $base = Str::slug($source) ?: Str::random(8);
        $slug = $base;
        $suffix = 1;

        while (
            static::query()
                ->where('slug', $slug)
                ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
                ->exists()
        ) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
