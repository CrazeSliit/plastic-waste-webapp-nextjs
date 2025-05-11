"use client";

import { useState, useEffect } from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { MapPin, Calendar, Clock, Trash2, Package } from "lucide-react";
import Link from "next/link";

export default function CollectionPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const { toast } = useToast();

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/collections');
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to fetch collections');
      
      if (data.success && Array.isArray(data.collections)) {
        // Sort collections by date
        const sorted = data.collections.sort((a, b) => 
          new Date(b.date) - new Date(a.date)
        );
        setCollections(sorted);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load collections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const upcomingCollections = collections.filter(
    c => new Date(c.date) > new Date() && c.status !== "CANCELLED"
  );

  const pastCollections = collections.filter(
    c => new Date(c.date) <= new Date() || c.status === "CANCELLED"
  );

  if (loading) {
    return (
      <Container className="py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Waste Collection</h1>
          <p className="text-muted-foreground">
            Schedule and track your plastic waste collection requests
          </p>
        </div>
        <Button asChild>
          <Link href="/collection/schedule">Schedule Collection</Link>
        </Button>
      </div>

      <div className="space-y-8">
        {/* Upcoming Collections */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Upcoming Collections</h2>
          {upcomingCollections.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              No upcoming collections scheduled
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingCollections.map((collection) => (
                <CollectionCard 
                  key={collection.id} 
                  collection={collection}
                  onStatusChange={fetchCollections}
                />
              ))}
            </div>
          )}
        </section>

        {/* Past Collections */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Past Collections</h2>
          {pastCollections.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              No past collections
            </Card>
          ) : (
            <div className="grid gap-4">
              {pastCollections.map((collection) => (
                <CollectionCard 
                  key={collection.id} 
                  collection={collection}
                  isPast
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </Container>
  );
}

function CollectionCard({ collection, onStatusChange, isPast }) {
  const { toast } = useToast();

  const statusColors = {
    SCHEDULED: "bg-blue-100 text-blue-800",
    INPROGRESS: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800"
  };

  const handleCancel = async () => {
    try {
      const response = await fetch(`/api/collections/${collection.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'CANCELLED' })
      });

      if (!response.ok) throw new Error('Failed to cancel collection');

      toast({
        title: "Collection Cancelled",
        description: "The collection has been cancelled successfully.",
      });

      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to cancel collection",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-sm font-medium ${statusColors[collection.status]}`}>
              {collection.status}
            </span>
            <span className="text-sm text-muted-foreground">
              {collection.type}
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{collection.address}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {new Date(collection.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {new Date(collection.date).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>{collection.quantity} kg of {collection.wasteType}</span>
            </div>
          </div>
        </div>

        {!isPast && collection.status === 'SCHEDULED' && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
} 