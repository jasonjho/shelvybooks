const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NYTBook {
  title: string;
  author: string;
  book_image: string;
  amazon_product_url: string;
  primary_isbn13: string;
  primary_isbn10: string;
  description: string;
  rank: number;
}

interface NYTListResult {
  list_name: string;
  books: NYTBook[];
}

interface NYTResponse {
  status: string;
  results: {
    lists: NYTListResult[];
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('NYT_BOOKS_API_KEY');
    if (!apiKey) {
      console.error('NYT_BOOKS_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'NYT API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { listName = 'combined-print-and-e-book-fiction' } = await req.json().catch(() => ({}));

    console.log('Fetching NYT bestsellers list:', listName);

    // Use the overview endpoint to get multiple lists at once
    const response = await fetch(
      `https://api.nytimes.com/svc/books/v3/lists/overview.json?api-key=${apiKey}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NYT API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `NYT API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: NYTResponse = await response.json();
    
    // Find the requested list
    const list = data.results.lists.find(
      (l) => l.list_name.toLowerCase().replace(/\s+/g, '-') === listName.toLowerCase() ||
             l.list_name.toLowerCase().includes(listName.toLowerCase().replace(/-/g, ' '))
    );

    if (!list) {
      // Return combined fiction as default
      const defaultList = data.results.lists.find(
        (l) => l.list_name.toLowerCase().includes('fiction')
      );
      
      if (!defaultList) {
        return new Response(
          JSON.stringify({ success: false, error: 'List not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Using default fiction list');
      return new Response(
        JSON.stringify({
          success: true,
          books: defaultList.books.slice(0, 15).map(formatBook),
          listName: defaultList.list_name,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found list: ${list.list_name} with ${list.books.length} books`);

    return new Response(
      JSON.stringify({
        success: true,
        books: list.books.slice(0, 15).map(formatBook),
        listName: list.list_name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching bestsellers:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatBook(book: NYTBook) {
  return {
    key: book.primary_isbn13 || book.primary_isbn10 || book.title,
    title: book.title,
    author: book.author,
    coverUrl: book.book_image || null,
    amazonUrl: book.amazon_product_url,
    description: book.description,
    rank: book.rank,
  };
}
