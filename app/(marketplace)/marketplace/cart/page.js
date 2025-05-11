"use client";

import { useState, useEffect, useCallback } from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, Trash2, Minus, Plus, CreditCard, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load cart data
  useEffect(() => {
    const loadCart = () => {
      try {
        const savedCart = localStorage.getItem('ecorecycleCart');
        const parsedCart = savedCart ? JSON.parse(savedCart) : [];
        setCartItems(parsedCart);
      } catch (error) {
        console.error('Error loading cart:', error);
        setCartItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, []);

  // Calculate subtotal
  const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const shipping = subtotal >= 5000 ? 0 : 350;
  const total = subtotal + shipping;

  // Create memoized update functions
  const updateItemQuantity = useCallback((productId, newQuantity) => {
    setCartItems(prevItems => {
      const updatedItems = prevItems.map(item => 
        item._id === productId 
          ? { ...item, quantity: Math.max(1, newQuantity) }
          : item
      );
      localStorage.setItem('ecorecycleCart', JSON.stringify(updatedItems));
      
      // Use a timeout to dispatch the event after render
      setTimeout(() => {
        window.dispatchEvent(new Event('cartUpdated'));
      }, 0);
      
      return updatedItems;
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setCartItems(prevItems => {
      const updatedItems = prevItems.filter(item => item._id !== productId);
      localStorage.setItem('ecorecycleCart', JSON.stringify(updatedItems));
      
      // Use a timeout to dispatch the event after render
      setTimeout(() => {
        window.dispatchEvent(new Event('cartUpdated'));
      }, 0);
      
      return updatedItems;
    });
  }, []);

  const handleCheckout = () => {
    // In a real app, you would navigate to checkout page
    // For now, let's just clear the cart and show a confirmation
    alert("Thank you for your order! In a real app, you would proceed to payment.");
    setCartItems([]);
    localStorage.setItem("ecorecycleCart", JSON.stringify([]));
    // Dispatch event for header to update
    window.dispatchEvent(new Event('cartUpdated'));
    router.push('/marketplace');
  };

  if (loading) {
    return (
      <Container className="py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Container>
    );
  }

  if (cartItems.length === 0) {
    return (
      <Container className="py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6 min-h-[400px]">
            <h2 className="text-2xl font-semibold mb-4">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Start shopping to add items to your cart</p>
            <Button asChild>
              <Link href="/marketplace">Browse Products</Link>
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Shopping Cart</h1>
          <Button variant="ghost" size="sm" asChild className="pl-0">
            <Link href="/marketplace" className="flex items-center text-gray-600 hover:text-green-600">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Continue Shopping
            </Link>
          </Button>
        </div>
        <div className="text-gray-500">
          {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
        </div>
      </div>

      {/* Cart Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              {cartItems.map((item) => (
                <div 
                  key={item._id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4 border-b last:border-b-0 last:pb-0 first:pt-0"
                >
                  {/* Product Image */}
                  <div className="relative w-24 h-24 rounded-md overflow-hidden flex-shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  
                  {/* Product Details */}
                  <div className="flex-grow">
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <div>
                        <h3 className="font-medium">
                          <Link href={`/marketplace/${item._id}`} className="hover:text-green-600">
                            {item.name}
                          </Link>
                        </h3>
                        {item.variant && (
                          <p className="text-sm text-gray-500">Variant: {item.variant}</p>
                        )}
                        <p className="font-bold text-green-700 mt-1 sm:hidden">
                          Rs {item.price.toLocaleString()}
                        </p>
                      </div>
                      <p className="font-bold text-green-700 mt-1 hidden sm:block">
                        Rs {item.price.toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap justify-between items-center mt-3 gap-3">
                      {/* Quantity Controls */}
                      <div className="flex items-center border rounded-md">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => updateItemQuantity(item._id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="h-8 w-8 rounded-r-none"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <div className="h-8 w-8 flex items-center justify-center border-x">
                          {item.quantity}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => updateItemQuantity(item._id, item.quantity + 1)}
                          className="h-8 w-8 rounded-l-none"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {/* Item Subtotal & Remove Button */}
                      <div className="flex items-center gap-3">
                        <p className="text-sm">
                          Subtotal: <span className="font-semibold">Rs {(item.price * item.quantity).toLocaleString()}</span>
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeItem(item._id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-0 h-auto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>Rs {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>{shipping === 0 ? 'Free' : `Rs ${shipping.toLocaleString()}`}</span>
                </div>
                {shipping > 0 && (
                  <div className="text-xs text-gray-500 pt-1">
                    Free shipping on orders over Rs 5,000
                  </div>
                )}
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-green-700">Rs {total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <Button 
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                size="lg"
                onClick={handleCheckout}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Proceed to Checkout
              </Button>
              
              <div className="mt-6">
                <div className="text-sm text-gray-500 mb-3">We accept:</div>
                <div className="flex gap-2">
                  <div className="h-8 w-12 bg-gray-100 rounded flex items-center justify-center text-xs font-medium text-gray-800">VISA</div>
                  <div className="h-8 w-12 bg-gray-100 rounded flex items-center justify-center text-xs font-medium text-gray-800">MC</div>
                  <div className="h-8 w-12 bg-gray-100 rounded flex items-center justify-center text-xs font-medium text-gray-800">AMEX</div>
                  <div className="h-8 w-12 bg-gray-100 rounded flex items-center justify-center text-xs font-medium text-gray-800">LKR</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-4 text-sm text-gray-500">
            <p className="mb-2">All transactions are secure and encrypted. Your personal information is protected.</p>
            <p>Questions? Contact our customer support at support@ecorecycle.lk</p>
          </div>
        </div>
      </div>
    </Container>
  );
} 