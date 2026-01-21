import { Banner, Head } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import 'nextra-theme-docs/style.css';

export const metadata = {
  title: 'lio-client - TypeScript SDK for the Lytics API',
  description:
    'Modern TypeScript SDK for the Lytics API with a plugin-based architecture for extensibility',
};

const banner = (
  <Banner storageKey="lio-client-banner" dismissible>
    lio-client is in active development. APIs may change.
  </Banner>
);

const navbar = (
  <Navbar
    logo={<strong>lio-client</strong>}
    projectLink="https://github.com/lytics/lio-client"
    chatLink="https://github.com/lytics/lio-client/discussions"
  />
);

const footer = (
  <Footer>
    MIT {new Date().getFullYear()} ©{' '}
    <a href="https://github.com/lytics" target="_blank" rel="noreferrer">
      Lytics
    </a>
    .
  </Footer>
);

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body>
        <Layout
          banner={banner}
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/lytics/lio-client/tree/main/docs/content"
          footer={footer}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
