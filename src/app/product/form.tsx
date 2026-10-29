import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { BottomBar, Button, Header, ImageField, Notice, OptionSheet, Page, ScrollScreen, SelectField, Sheet, TextField } from '@/components';
import { useActions, useBusiness, useDb } from '@/data/DataProvider';
import type { ProductField } from '@/domain/catalog';
import { FieldErrors, parseQuantity, ValidationError } from '@/domain/validation';
import { useMoney } from '@/hooks/useMoney';
import { spacing, type } from '@/theme';
import { goBack } from '@/utils/navigation';

const NEW_CATEGORY = '__new__';
const NO_CATEGORY = '__none__';

export default function ProductForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const state = useDb();
  const { settings } = useBusiness();
  const actions = useActions();
  const money = useMoney();
  const router = useRouter();
  const existing = id ? state.products.find((p) => p.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? null);
  const [price, setPrice] = useState(money.toInput(existing?.sellingPrice));
  const [cost, setCost] = useState(money.toInput(existing?.costPrice));
  const [stock, setStock] = useState('');
  const [threshold, setThreshold] = useState(existing?.lowStockThreshold != null ? String(existing.lowStockThreshold) : '');
  const [unit, setUnit] = useState(existing?.unit ?? '');
  const [sku, setSku] = useState(existing?.sku ?? '');
  const [barcode, setBarcode] = useState(existing?.barcode ?? '');
  const [imageUri, setImageUri] = useState<string | null>(existing?.imageUri ?? null);
  const [errors, setErrors] = useState<FieldErrors<ProductField> & { form?: string }>({});
  const [saving, setSaving] = useState(false);
  const [categorySheet, setCategorySheet] = useState(false);
  const [newCategory, setNewCategory] = useState<string | null>(null);

  const parsedPrice = money.parse(price);
  const parsedCost = cost.trim() ? money.parse(cost) : null;
  const margin = parsedPrice != null && parsedCost != null && parsedPrice > 0 ? parsedPrice - parsedCost : null;

  const save = async () => {
    const e: typeof errors = {};
    if (parsedPrice == null) e.sellingPrice = 'Enter a valid price, e.g. 1500 or 1500.50.';
    if (cost.trim() && parsedCost == null) e.costPrice = 'Enter a valid cost or leave it empty.';
    const openingStock = stock.trim() ? parseQuantity(stock) : 0;
    if (!existing && openingStock == null) e.openingStock = 'Enter a whole number of units.';
    const lowThreshold = threshold.trim() ? parseQuantity(threshold) : null;
    if (threshold.trim() && lowThreshold == null) e.lowStockThreshold = 'Enter a whole number.';
    if (!name.trim()) e.name = 'Enter a product name.';
    if (Object.keys(e).length) return setErrors(e);

    setSaving(true);
    setErrors({});
    const input = {
      name,
      categoryId,
      sellingPrice: parsedPrice,
      costPrice: parsedCost,
      openingStock: existing ? null : openingStock,
      lowStockThreshold: lowThreshold,
      unit,
      sku,
      barcode,
      imageUri: imageUri ?? undefined,
    };
    try {
      if (existing) {
        await actions.updateProduct(existing.id, input);
        goBack(router);
      } else {
        const p = await actions.createProduct(input);
        router.replace({ pathname: '/product/[id]', params: { id: p.id, created: '1' } });
      }
    } catch (err) {
      setErrors(err instanceof ValidationError ? { ...err.fields, form: err.message } : { form: "The product couldn't be saved. Try again." });
      setSaving(false);
    }
  };

  const addCategory = async () => {
    if (!newCategory?.trim()) return;
    const c = await actions.createCategory(newCategory);
    setCategoryId(c.id);
    setNewCategory(null);
  };

  const categoryOptions = [
    { value: NO_CATEGORY, label: 'No category' },
    ...state.categories.map((c) => ({ value: c.id, label: c.name })),
    { value: NEW_CATEGORY, label: '+ New category' },
  ];

  return (
    <Page>
      <Header title={existing ? 'Edit product' : 'New product'} back />
      <ScrollScreen
        footer={
          <BottomBar>
            {errors.form && <Notice tone="danger" message={errors.form} />}
            <Button label={existing ? 'Save changes' : 'Add product'} onPress={save} loading={saving} />
          </BottomBar>
        }
      >
        <TextField label="Product name" value={name} onChangeText={setName} placeholder="e.g. Peak Milk Tin 400g" autoCapitalize="sentences" error={errors.name} />
        <SelectField
          label="Category"
          optional
          value={state.categories.find((c) => c.id === categoryId)?.name ?? null}
          placeholder="No category"
          onPress={() => setCategorySheet(true)}
          error={errors.categoryId}
        />
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <TextField label="Selling price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" prefix={money.currency.symbol} error={errors.sellingPrice} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Cost price" optional value={cost} onChangeText={setCost} keyboardType="decimal-pad" prefix={money.currency.symbol} error={errors.costPrice} />
          </View>
        </View>
        <Text style={type.caption}>
          {margin != null
            ? `Profit per unit: ${money.format(margin)}${margin < 0 ? ' — you are selling below cost.' : ''}`
            : 'Add what you paid per unit so BizTracker can calculate profit.'}
        </Text>

        {settings.trackStock && !existing && (
          <TextField
            label="Quantity in stock now"
            value={stock}
            onChangeText={(v) => setStock(v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
            error={errors.openingStock}
            hint="Recorded as opening stock. Later changes go through stock adjustments."
          />
        )}
        {settings.trackStock && existing && (
          <Notice message={`Stock: ${existing.stockQuantity}. Use “Adjust stock” on the product page to change it, so every change is recorded.`} />
        )}

        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <TextField label="Unit" optional value={unit} onChangeText={setUnit} placeholder="e.g. tin, kg, pack" />
          </View>
          {settings.trackStock && settings.lowStockAlerts && (
            <View style={{ flex: 1 }}>
              <TextField
                label="Low-stock level"
                optional
                value={threshold}
                onChangeText={(v) => setThreshold(v.replace(/\D/g, ''))}
                keyboardType="number-pad"
                placeholder={String(settings.lowStockThreshold)}
                error={errors.lowStockThreshold}
              />
            </View>
          )}
        </View>

        {settings.useSkus && (
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <TextField label="SKU" optional value={sku} onChangeText={setSku} autoCapitalize="characters" error={errors.sku} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Barcode" optional value={barcode} onChangeText={setBarcode} keyboardType="number-pad" error={errors.barcode} />
            </View>
          </View>
        )}

        <ImageField label="Product photo" value={imageUri} onChange={setImageUri} hint="Helps you find products quickly at checkout." />
      </ScrollScreen>

      <OptionSheet
        visible={categorySheet}
        onClose={() => setCategorySheet(false)}
        title="Category"
        options={categoryOptions}
        value={categoryId ?? NO_CATEGORY}
        onSelect={(v) => {
          if (v === NEW_CATEGORY) setTimeout(() => setNewCategory(''), 350);
          else setCategoryId(v === NO_CATEGORY ? null : v);
        }}
      />
      <Sheet
        visible={newCategory != null}
        onClose={() => setNewCategory(null)}
        title="New category"
        footer={<Button label="Add category" onPress={addCategory} disabled={!newCategory?.trim()} />}
      >
        <View style={{ paddingBottom: spacing.sm }}>
          <TextField label="Category name" value={newCategory ?? ''} onChangeText={setNewCategory} placeholder="e.g. Beverages" autoFocus />
        </View>
      </Sheet>
    </Page>
  );
}
