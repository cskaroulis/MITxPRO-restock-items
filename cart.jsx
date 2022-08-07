// helper functions

// turn an item id into an image source
const getPhotoSrc = (id) => {
  return `http://localhost:8080/images/product${id}.png`;
}

// returns a random string
const makeRequestId = (length) => {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() *
      charactersLength));
  }
  return result;
}

// grab data
const useDataApi = (initialUrl, initialData) => {
  const { useState, useEffect, useReducer } = React;
  const [url, setUrl] = useState(initialUrl);

  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    data: initialData,
  });
  console.log(`useDataApi called`);
  useEffect(() => {
    console.log("useEffect Called");
    let didCancel = false;
    const fetchData = async () => {
      dispatch({ type: "FETCH_INIT" });
      try {
        const result = await axios(url);
        console.log("FETCH FROM URL");
        if (!didCancel) {
          dispatch({ type: "FETCH_SUCCESS", payload: result.data });
        }
      } catch (error) {
        if (!didCancel) {
          dispatch({ type: "FETCH_FAILURE" });
        }
      }
    };
    fetchData();
    return () => {
      didCancel = true;
    };
  }, [url]);
  return [state, setUrl];
};
const dataFetchReducer = (state, action) => {
  switch (action.type) {
    case "FETCH_INIT":
      return {
        ...state,
        isLoading: true,
        isError: false,
      };
    case "FETCH_SUCCESS":
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: action.payload,
      };
    case "FETCH_FAILURE":
      return {
        ...state,
        isLoading: false,
        isError: true,
      };
    default:
      throw new Error();
  }
};


const Cart = (props) => {
  const { Card, Accordion, Button } = ReactBootstrap;
  let data = props.location.data ? props.location.data : products;
  console.log(`data:${JSON.stringify(data)}`);

  return <Accordion defaultActiveKey="0">{list}</Accordion>;
};

const Products = (props) => {
  const [items, setItems] = React.useState([]);
  const [isRestocking, setIsRestocking] = React.useState(false);
  const [cart, setCart] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const {
    Card,
    Accordion,
    Button,
    Container,
    Row,
    Col,
    Image,
    Input,
  } = ReactBootstrap;
  //  Fetch Data
  const { Fragment, useState, useEffect, useReducer } = React;
  const [query, setQuery] = useState("http://localhost:1337/api/products/");
  const [{ data, isLoading, isError }, doFetch] = useDataApi(
    "http://localhost:1337/api/products/",
    {
      data: [],
    }
  );

  // this useEffect watches for changes to the data object
  // and if we are in restocking mode, it uses the data to restock.
  // If not in restocking mode, it just saves the data into state.
  useEffect(() => {
    let products;
    if (data && data["data"] && data["data"].length) {
      // when data is returned from the cartDB it is too nested.
      // here we flatten the product objects
      products = data["data"].map((item) => {
        return { id: item.id, ...item.attributes };
      });
      console.log("Raw data from cartDB:", data);
      console.log("Processed data from cartDB:", products);
    } else {
      return;
    }
    if (isRestocking) {
      let updatedItems = items.map(itemInState => {
        const itemFromDB = products.find(item => item.id === itemInState.id);
        itemInState.instock = itemInState.instock + itemFromDB.instock;
        return itemInState;
      });
      setItems(updatedItems);
      setIsRestocking(false);
    } else {
      setItems(products);
    }

  }, [data]); // Only re-run the effect if data changes

  const addToCart = (e) => {
    let name = e.target.name;
    let item = items.filter((item) => item.name == name);
    if (item[0].instock == 0) return;
    item[0].instock = item[0].instock - 1;
    console.log(`add to Cart ${JSON.stringify(item)}`);
    setCart([...cart, ...item]);
  };

  const deleteCartItem = (delIndex) => {
    // this is the index in the cart not in the Product List
    let newCart = cart.filter((item, i) => delIndex != i);
    let target = cart.filter((item, index) => delIndex == index);
    let newItems = items.map((item, index) => {
      if (item.name == target[0].name) item.instock = item.instock + 1;
      return item;
    });
    setCart(newCart);
    setItems(newItems);
  };

  let list = items.map((item, index) => {
    return (
      <li key={index}>
        <Image src={getPhotoSrc(item.id)} width={70} roundedCircle></Image>
        <Button variant="primary" size="large">
          {item.name}:${item.cost}-Stock={item.instock}
        </Button>

        <div><input name={item.name} type="submit" onClick={addToCart}></input></div>
      </li>
    );
  });

  let cartList = cart.map((item, index) => {
    return (
      <Card key={index}>
        <Card.Header>
          <Accordion.Toggle as={Button} variant="link" eventKey={1 + index}>
            {item.name}
          </Accordion.Toggle>
        </Card.Header>
        <Accordion.Collapse
          onClick={() => deleteCartItem(index)}
          eventKey={1 + index}
        >
          <Card.Body>
            $ {item.cost} from {item.country}
          </Card.Body>
        </Accordion.Collapse>
      </Card>
    );
  });

  let finalList = () => {
    let total = checkOut();
    let final = cart.map((item, index) => {
      return (
        <div key={index} index={index}>
          {item.name}
        </div>
      );
    });
    return { final, total };
  };

  const checkOut = () => {
    if (!cart || !cart.length) { return }
    let costs = cart.map((item) => item.cost);
    const reducer = (accum, current) => accum + current;
    let newTotal = costs.reduce(reducer, 0);
    return newTotal;
  };

  const restockProducts = (url) => {
    setIsRestocking(true);
    // doFetch fails to trigger the useEffect when the url has not changed.
    // Here I add a small random string to the url to make it unique
    // which in turn will trigger the useEffect
    doFetch(url + "?requestId=" + makeRequestId(5));
  };

  return (
    <Container>
      <Row>
        <Col>
          <h1>Product List</h1>
          <ul style={{ listStyleType: "none" }}>{list}</ul>
        </Col>
        <Col>
          <h1>Cart Contents</h1>
          <Accordion>{cartList}</Accordion>
        </Col>
        <Col>
          <h1>CheckOut </h1>
          <Button onClick={checkOut}>CheckOut $ {finalList().total}</Button>
          <div> {finalList().total > 0 && finalList().final} </div>
        </Col>
      </Row>
      <Row>
        <form
          onSubmit={(event) => {
            // the preventDefault() has to be called first
            // else the data fetch awaits long enough
            // for the browser to refresh the page.
            event.preventDefault();
            restockProducts(query);
          }}
        >
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit">ReStock Products</button>
        </form>
      </Row>
    </Container>
  );
};
// ========================================
ReactDOM.render(<Products />, document.getElementById("root"));
