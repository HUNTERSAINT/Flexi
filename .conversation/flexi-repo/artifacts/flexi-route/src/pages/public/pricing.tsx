import React from 'react';
import { useListPricing } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Check, Loader2 } from 'lucide-react';

export default function Pricing() {
  const { data: pricingList, isLoading } = useListPricing();

  return (
    <div className="bg-gray-50 min-h-screen py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-extrabold text-secondary mb-4">Transparent Pricing for Every Scale</h1>
          <p className="text-xl text-gray-600">Choose the service level that fits your timeline and budget. All rates include insurance and real-time tracking.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {pricingList?.map((tier) => (
              <Card key={tier.id} className={`flex flex-col relative ${tier.serviceType === 'express' ? 'border-primary shadow-xl scale-105 z-10' : 'border-gray-200'}`}>
                {tier.serviceType === 'express' && (
                  <div className="absolute top-0 inset-x-0 -translate-y-1/2 flex justify-center">
                    <span className="bg-primary text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">Most Popular</span>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl font-bold capitalize text-secondary">{tier.serviceType}</CardTitle>
                  <p className="text-gray-500 text-sm mt-2 min-h-[40px]">{tier.description}</p>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold text-secondary">${tier.basePriceUsd}</span>
                    <span className="text-gray-500 font-medium"> base</span>
                  </div>
                  <ul className="space-y-4 mb-6">
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span className="text-gray-600">+{tier.pricePerKg}/kg additional</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span className="text-gray-600">Delivery in {tier.estimatedDays}</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span className="text-gray-600">Real-time GPS Tracking</span>
                    </li>
                    {tier.serviceType !== 'standard' && (
                      <li className="flex items-start">
                        <Check className="h-5 w-5 text-primary shrink-0 mr-2" />
                        <span className="text-gray-600">Priority Support</span>
                      </li>
                    )}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/book" className="w-full">
                    <Button 
                      className="w-full h-12" 
                      variant={tier.serviceType === 'express' ? 'default' : 'outline'}
                    >
                      Book {tier.serviceType}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
