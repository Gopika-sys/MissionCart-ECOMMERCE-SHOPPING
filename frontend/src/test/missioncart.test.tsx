import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import { CountryProvider } from '../context/CountryContext';
import { CartProvider } from '../context/CartContext';
import { ProductCard } from '../components/ProductCard';
import { EditorialCollectionGallery } from '../components/EditorialCollectionGallery';
import { CountrySelectorModal } from '../components/CountrySelectorModal';
import { HomePage } from '../pages/HomePage';
import { Navbar } from '../components/Navbar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { RegisterPage } from '../pages/AccountAndInfoPages';
import { formatINR } from '../services/api';
import { Product } from '../types';

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <CountryProvider>
          <CartProvider>
            <MemoryRouter>{ui}</MemoryRouter>
          </CartProvider>
        </CountryProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const sampleVerifiedProduct: Product = {
  id: 1,
  sku: 'MC-ELEC-001',
  name: '1.5L Stainless Electric Kettle',
  slug: 'electric-kettle-mcelec001',
  brandName: 'Philips Home',
  categoryId: 1,
  categoryName: 'Electronics',
  sourcePlatform: 'MISSIONCART_DIRECT',
  productType: 'MISSIONCART_DIRECT',
  description: 'Quick-boil 1500W kettle',
  price: 1299,
  originalPrice: 1699,
  currency: 'INR',
  priceVerified: true,
  availabilityStatus: 'IN_STOCK',
  stockQuantity: 24,
  ratingVerified: false,
  dataVerificationStatus: 'MISSIONCART_CATALOG_VERIFIED',
  specifications: { wattage: 1500 },
  attributes: {},
  missionTags: ['hostel', 'kitchen'],
  priorityTier: 'BUDGET',
  lifecycleOptions: ['REPAIR'],
  imageUrl: '/verified-media/elec_kettle.jpg',
  imageSource: 'Wikimedia Commons',
  imageLicense: 'CC BY-SA',
  imageStatus: 'VERIFIED',
  additionalImages: [],
  published: true,
  approved: true,
};

const sampleOpenCatalogProduct: Product = {
  ...sampleVerifiedProduct,
  id: 2,
  sku: 'OBF-8904417306521',
  name: 'Sali-cinamide Anti-acne Serum',
  brandName: 'The Derma Co',
  slug: 'salicinamide-serum-obf890',
  sourcePlatform: 'OPEN_BEAUTY_FACTS',
  sourceType: 'PRODUCT_INFORMATION_DATABASE',
  productType: 'EXTERNAL_CATALOG',
  price: 0,
  priceStatus: 'UNAVAILABLE',
  priceVerified: false,
  imageUrl: 'https://images.openbeautyfacts.org/images/products/890/441/730/6521/front_en.3.400.jpg',
  imageStatus: 'VERIFIED',
};

const sampleFashionVariantProduct: Product = {
  ...sampleVerifiedProduct,
  id: 3,
  sku: 'BRAND-LIBAS-001',
  name: 'Libas Burgundy Floral Maxi Dress',
  brandName: 'Libas',
  slug: 'libas-floral-maxi-dress',
  sourcePlatform: 'LIBAS_OFFICIAL',
  sourceType: 'MANUFACTURER',
  productType: 'EXTERNAL_CATALOG',
  gender: 'WOMEN',
  garmentType: 'Maxi Dress',
  price: 1899,
  originalPrice: 3499,
  variants: [
    { id: 101, variantSku: 'LIB-S', size: 'S', color: 'Burgundy', variantName: 'S', price: 1899, stockQuantity: 5, availabilityStatus: 'IN_STOCK', defaultVariant: false },
    { id: 102, variantSku: 'LIB-M', size: 'M', color: 'Burgundy', variantName: 'M', price: 1899, stockQuantity: 8, availabilityStatus: 'IN_STOCK', defaultVariant: true },
  ],
};

describe('MissionCart Redesigned Frontend Suite', () => {
  it('formats INR currency properly', () => {
    expect(formatINR(5000)).toContain('5,000');
  });

  it('renders genuine product photos without pending-verification banners on customer cards', () => {
    renderWithProviders(
      <>
        <ProductCard product={sampleVerifiedProduct} />
        <ProductCard product={sampleOpenCatalogProduct} />
        <ProductCard product={sampleFashionVariantProduct} />
      </>
    );

    const img = screen.getByAltText('1.5L Stainless Electric Kettle') as HTMLImageElement;
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(screen.queryByText(/PHOTOGRAPH PENDING VERIFICATION/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Information reference \(no price\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Reference/i })).toBeInTheDocument();
    expect(screen.getByText(/Sizes: S, M/i)).toBeInTheDocument();
    expect(screen.getByText('Maxi Dress')).toBeInTheDocument();
  });

  it('renders homepage editorial mission planner headline and example prompts', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Your world\. Your style\./i)).toBeInTheDocument();
    expect(screen.getByText(/Explore our collections\./i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe what you're trying to do|Beauty/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search with AI/i })).toBeInTheDocument();
    expect(screen.getByText(/Skincare routine under ₹2,000/i)).toBeInTheDocument();
  });

  it('renders Wishlist link with count in Navbar and PageHeader back navigation', () => {
    renderWithProviders(
      <>
        <Navbar />
        <PageHeader title="Dairy Catalogue" breadcrumbs={[{ label: 'Catalogue', to: '/products' }, { label: 'Dairy' }]} />
      </>
    );
    expect(screen.getByRole('link', { name: /Wishlist/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
    expect(screen.getByText('Dairy Catalogue')).toBeInTheDocument();
  });

  it('handles ConfirmDialog keep and confirm callbacks cleanly', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        message="Are you sure you want to remove this item?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    expect(screen.getByText(/Are you sure you want to remove this item/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Keep Item/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Yes, Remove/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows inline validation errors on invalid registration submission', () => {
    renderWithProviders(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText(/^Password \*/i), { target: { value: 'weak' } });
    fireEvent.change(screen.getByLabelText(/^Confirm Password/i), { target: { value: 'other' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(screen.getByText(/Enter a valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    expect(screen.getByText(/Please accept the Terms/i)).toBeInTheDocument();
  });

  it('renders EditorialCollectionGallery with distinct multi-tile images and Country button in Navbar', () => {
    renderWithProviders(
      <>
        <Navbar />
        <EditorialCollectionGallery
          categorySlug="fashion"
          countryCode="IN"
          collections={[
            {
              id: 1,
              categorySlug: 'fashion',
              slug: 'old-money-collection',
              title: 'Old Money Collection',
              subtitle: 'Linen & Tailored Layers',
              matchingProductCount: 24,
              filterParams: {},
              collageTiles: [
                { productId: 11, slug: 'a', name: 'Linen Blazer', imageUrl: '/verified-media/a.jpg', price: 2999, currency: 'INR' },
                { productId: 12, slug: 'b', name: 'Oxford Shirt', imageUrl: '/verified-media/b.jpg', price: 1499, currency: 'INR' },
                { productId: 13, slug: 'c', name: 'Chinos', imageUrl: '/verified-media/c.jpg', price: 1799, currency: 'INR' },
                { productId: 14, slug: 'd', name: 'Classic Watch', imageUrl: '/verified-media/d.jpg', price: 2499, currency: 'INR' },
              ],
            },
          ]}
        />
      </>
    );
    expect(screen.getByRole('button', { name: /Select shopping country/i })).toBeInTheDocument();
    expect(screen.getByText('Old Money Collection')).toBeInTheDocument();
    expect(screen.getByAltText('Linen Blazer')).toBeInTheDocument();
    expect(screen.getByAltText('Classic Watch')).toBeInTheDocument();
  });

  it('opens global CountrySelectorModal from Navbar and allows switching country cleanly', () => {
    renderWithProviders(
      <>
        <Navbar />
        <CountrySelectorModal />
      </>
    );
    fireEvent.click(screen.getByRole('button', { name: /Select shopping country/i }));
    expect(screen.getByText(/Where would you like to/i)).toBeInTheDocument();
    expect(screen.getByText(/Popular Shopping Destinations/i)).toBeInTheDocument();
  });
});
