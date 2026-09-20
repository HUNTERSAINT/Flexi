import React, { useState } from 'react';
import { useListPricing, useUpdatePricing } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getListPricingQueryKey } from '@workspace/api-client-react';

export default function AdminPricing() {
  const { data: pricingList, isLoading } = useListPricing();

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary tracking-tight">Pricing Config</h1>
        <p className="text-gray-500 mt-1">Manage base rates and per-kg modifiers for shipping services.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {pricingList?.map(pricing => (
          <PricingCard key={pricing.id} pricing={pricing} />
        ))}
      </div>
    </div>
  );
}

function PricingCard({ pricing }: { pricing: any }) {
  const [basePrice, setBasePrice] = useState(pricing.basePriceUsd.toString());
  const [pricePerKg, setPricePerKg] = useState(pricing.pricePerKg.toString());
  const [days, setDays] = useState(pricing.estimatedDays || '');
  const [desc, setDesc] = useState(pricing.description || '');

  const updatePricing = useUpdatePricing();
  const queryClient = useQueryClient();

  const handleSave = async () => {
    try {
      await updatePricing.mutateAsync({
        id: pricing.id,
        data: {
          basePriceUsd: parseFloat(basePrice),
          pricePerKg: parseFloat(pricePerKg),
          estimatedDays: days,
          description: desc
        }
      });
      queryClient.invalidateQueries({ queryKey: getListPricingQueryKey() });
      toast.success(`${pricing.serviceType} pricing updated`);
    } catch (e) {
      toast.error('Failed to update pricing');
    }
  };

  return (
    <Card className="overflow-hidden border border-gray-200">
      <div className="bg-secondary px-6 py-4">
        <h3 className="text-xl font-bold text-white capitalize">{pricing.serviceType} Tier</h3>
      </div>
      <CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Base Price (USD)</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input type="number" step="0.01" value={basePrice} onChange={e => setBasePrice(e.target.value)} className="pl-7" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Price per KG (USD)</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input type="number" step="0.01" value={pricePerKg} onChange={e => setPricePerKg(e.target.value)} className="pl-7" />
            </div>
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700">Estimated Delivery Time (String)</label>
          <Input value={days} onChange={e => setDays(e.target.value)} placeholder="e.g. 3-5 business days" className="mt-1" />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Marketing Description</label>
          <Textarea value={desc} onChange={e => setDesc(e.target.value)} className="mt-1" />
        </div>

        <Button className="w-full mt-2" onClick={handleSave} disabled={updatePricing.isPending}>
          {updatePricing.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
