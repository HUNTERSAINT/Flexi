import React, { useState } from 'react';
import { getGetWalletsQueryKey, useGetWallets, useUpdateWallet } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Save, Wallet } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminWallets() {
  const { data: wallets, isLoading } = useGetWallets();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-secondary tracking-tight">Crypto Wallets</h1>
        <p className="text-gray-500 mt-1">
          Manage wallet addresses for each cryptocurrency. Changes take effect immediately for new payments.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {wallets?.map((wallet: any) => (
          <WalletCard key={wallet.id} wallet={wallet} />
        ))}
      </div>
    </div>
  );
}

function WalletCard({ wallet }: { wallet: any }) {
  const [label, setLabel] = useState(wallet.label);
  const [network, setNetwork] = useState(wallet.network);
  const [address, setAddress] = useState(wallet.address);
  const [isActive, setIsActive] = useState(wallet.isActive);

  const updateWallet = useUpdateWallet();
  const queryClient = useQueryClient();

  const isDirty =
    label !== wallet.label ||
    network !== wallet.network ||
    address !== wallet.address ||
    isActive !== wallet.isActive;

  const handleSave = () => {
    updateWallet.mutate(
      { id: wallet.id, data: { label, network, address, isActive } },
      {
        onSuccess: () => {
          toast.success(`${wallet.currency} wallet updated`);
          queryClient.invalidateQueries({ queryKey: getGetWalletsQueryKey() });
        },
        onError: () => toast.error('Failed to save wallet'),
      }
    );
  };

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardContent className="pt-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-secondary text-lg">{wallet.currency}</p>
              <p className="text-xs text-gray-400">{wallet.network}</p>
            </div>
          </div>
          <Badge
            variant={isActive ? 'default' : 'secondary'}
            className="cursor-pointer select-none"
            onClick={() => setIsActive((v: boolean) => !v)}
          >
            {isActive ? 'Active' : 'Disabled'}
          </Badge>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Display Label</label>
            <Input
              className="mt-1"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Bitcoin"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Network</label>
            <Input
              className="mt-1"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              placeholder="e.g. Bitcoin Network"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Wallet Address</label>
            <Input
              className="mt-1 font-mono text-sm"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter wallet address"
            />
          </div>
        </div>

        {/* Save */}
        <Button
          className="w-full"
          onClick={handleSave}
          disabled={!isDirty || updateWallet.isPending}
        >
          {updateWallet.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
