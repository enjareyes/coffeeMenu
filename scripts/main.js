var React = require('react');
var ReactDom = require('react-dom');

var ReactRouter = require('react-router');
var Router = ReactRouter.Router;
var Route = ReactRouter.Route;
var Navigation = ReactRouter.Navigation; //mixin
var History = ReactRouter.History; //mixin

// Cleans up urls so they don't have #/4akljdf in them and look messy
var createBrowserHistory = require('history/lib/createBrowserHistory');

var h = require('./helpers.js');

// Firebase npm module re-base
var Rebase = require('re-base');
var base = Rebase.createClass('https://react-menu.firebaseio.com');

// Mixin for bi-directional data flow so changing data can update state+firebase.
var Catalyst = require('react-catalyst');

/* 
  Creating a component allows us to create tags.
  Example: The App component below allows us 
  to create <App> and render to view.
  Within the App component there are child components:
  Header, Order, and Inventory.
*/

// Creating App Component
var App = React.createClass({
  mixins: [Catalyst.LinkedStateMixin],
  // Before react creates a component, it runs getInitialState and populates itself. 
  getInitialState: function(){
    return {
      coffees: {},
      order: {}
    }
  },
  componentDidMount: function(){
    base.syncState(this.props.params.storeId + '/coffees', {
      context: this,
      state: 'coffees'
    });

    var localStorageRef = localStorage.getItem('order-' + this.props.params.storeId);
    /* 
      If local storage contains current menu url get the 
      data from local storage and parse to set state 
    */
    if (localStorageRef) {
      this.setState({
        order: JSON.parse(localStorageRef)
      })
    }
  },
  componentWillUpdate: function(nextProps, nextState){
    // set current url as key to save order in local storage
    localStorage.setItem('order-' + this.props.params.storeId, JSON.stringify(nextState.order));
  },
  addCoffee: function(coffee){
    // create a timestamp to make coffee label unique
    var timestamp = (new Date()).getTime();
    // update state object
    this.state.coffees['coffee-' + timestamp] = coffee;
    // set the state with the updated object
    this.setState({coffees: this.state.coffees});
  },
  loadSamples: function() {
    this.setState({
      coffees: require('./sample-coffees')
    });
  },
  addToOrder: function(key) {
    // Add item to order
    this.state.order[key] = this.state.order[key] + 1 || 1;
    this.setState({
      order: this.state.order
    })
  },
  removeCoffee: function(key){
    if (confirm('Are you sure you want to remove?')){
      this.state.coffees[key] = null;
      this.setState({
        coffees: this.state.coffees
      })
    }
  },
  removeFromOrder: function(key){
    delete this.state.order[key];
    this.setState({
      order: this.state.order
    })
  },
  renderCoffee: function(key) {
    return <Coffee key={key} index={key} details={this.state.coffees[key]} addToOrder={this.addToOrder}/>
  },
  render: function() {
    return (
      <div className="coffee-of-the-day">
        <div className ="menu">
          <Header tagline="Brewed Fresh"/>
          <ul className='list-of-coffees'>
            {Object.keys(this.state.coffees).map(this.renderCoffee)}
          </ul>
        </div>
        <Order coffees={this.state.coffees} order={this.state.order} removeFromOrder={this.removeFromOrder} />
        <Inventory addCoffee={this.addCoffee} loadSamples={this.loadSamples} 
          coffees={this.state.coffees} linkState={this.linkState} removeCoffee={this.removeCoffee}/>
      </div>
    )
  }
})

// <Coffee>
var Coffee = React.createClass({
  addItem: function() {
    var key = this.props.index;
    this.props.addToOrder(key);
  },
  render: function() {
    var details = this.props.details;
    var isAvailable = (details.status === "available" ? true : false);
    var buttonText = (isAvailable ? 'Add To Order' : "Sold Out");

    return (
      <li className="menu-coffee">
        <img src={details.image} alt={details.name} />
        <h3 className="coffee-name">
          {details.name}
          <span className="price">{h.formatPrice(details.price)}</span>
        </h3>
        <p>{details.desc}</p>
        <button disabled={!isAvailable} onClick={this.addItem}>{buttonText}</button>
      </li>
    )
  }
})

//Add Item Form 
var AddCoffeeForm = React.createClass({
  createCoffee: function(event) {
    // stop form from submitting
    event.preventDefault();
    // take data from form and create an obj
    var coffee = {
      name: this.refs.name.value,
      status: this.refs.status.value,
      price: this.refs.price.value,
      desc: this.refs.desc.value,
      image: this.refs.image.value
    }
    // add coffee to app state
    this.props.addCoffee(coffee);
    this.refs.coffeeForm.reset();
  },
  render : function() {
    return (
      <form className="coffee-edit" ref="coffeeForm" onSubmit={this.createCoffee}>
        <input type="text" ref="name" placeholder="Coffee Name"/>
        <input type="text" ref="price" placeholder="Coffee Price" />
        <select ref="status">
          <option value="available">Fresh!</option>
          <option value="unavailable">Sold Out!</option>
        </select>
        <textarea type="text" ref="desc" placeholder="Desc"></textarea>
        <input type="text" ref="image" placeholder="URL to Image" />
        <button type="submit">+ Add Item </button>
      </form>
    )
  }
})


//Creating <Header/>
var Header = React.createClass({
  render: function() {
    return (
      <header className="top">
        <h1>Coffee
          <span className="ofThe">
            <span className="of">of the</span>
          </span>
          Day</h1>
        <h3 className="tagline">
          <span>{this.props.tagline}</span>
        </h3>
      </header>
    )
  }
})

// Creating <Order/>
var Order = React.createClass({
  renderOrder: function(key) {
    var coffee = this.props.coffees[key];
    var count = this.props.order[key];
    var removeButton = <button onClick={this.props.removeFromOrder.bind(null, key)}>&times;</button>

    if (!coffee) {
      return <li key={key}>Oops! No Longer Available {removeButton}</li>
    }

    return (
      <li key={key}>
        {count}lbs
        {coffee.name}
        <span className="price">{h.formatPrice(count * coffee.price)}</span>
        {removeButton}
      </li>
    )
  },
  render: function() {
    var orderIds = Object.keys(this.props.order);
    var total = orderIds.reduce((prevTotal, key) => {
      var coffee = this.props.coffees[key];
      var count = this.props.order[key];
      var isAvailable = coffee && coffee.status === "available";

      if (isAvailable) {
        return prevTotal + (count * parseInt(coffee.price) || 0);
      }

      return prevTotal;
    }, 0);

    return (
      <div className="order-wrap">
        <h2 className="order-title">Your Order</h2>
        <ul className="order">
          {orderIds.map(this.renderOrder)}
          <li className="total">
            <strong>Total: </strong>
            {h.formatPrice(total)}
          </li>
        </ul>
      </div>
    )
  }
})

// Creating <Inventory/>
var Inventory = React.createClass({
  renderInventory: function(key){
    var linkState = this.props.linkState;
    return (
      <div className='coffee-edit' key={key}>
        <input type="text" valueLink={linkState('coffees.' + key + '.name')} />
        <input type="text" valueLink={linkState('coffees.' + key + '.price')} />
        <select valueLink={linkState('coffees.' + key + '.status')}>
          <option value="available">Fresh!</option>
          <option value="unavailable">Sold Out!</option>
        </select>
        <textarea type="text" valueLink={linkState('coffees.' + key + '.desc')} />
        <input type="text" valueLink={linkState('coffees.' + key + '.image')} />
        <button onClick={this.props.removeCoffee.bind(null, key)}>Remove</button>
      </div>
    )
  },
  render: function() {
    return (
      <div>
        <h2>Inventory</h2>
        {Object.keys(this.props.coffees).map(this.renderInventory)}
        <AddCoffeeForm {...this.props} />
        <button onClick={this.props.loadSamples}>Load Samples</button>
      </div>
    )
  }
})

// Creating <StorePicker> component
var StorePicker = React.createClass({
  mixins: [History],
  goToStore: function(event) {
    event.preventDefault();
    // Get data from input
    var storeId = this.refs.storeId.value;
    // Transfer data to <App>
    this.history.pushState(null, '/store/' + storeId);
  },
  render: function() {
    return (
      <form className="store-selector" onSubmit={this.goToStore}>
        {/* JSX comments must be in curly braces or they render in view */}
        <h2>Choose a store!</h2>
        <input type="text" ref="storeId" required defaultValue={h.getFunName()} />
        <input type="submit" />
      </form>
    )
  }
});

var notFound = React.createClass({
  render: function() {
    return <h1>Page Not Found</h1>
  }
})

//Routes to render
var routes = (
  <Router history={createBrowserHistory()}>
    {/* Home path will start at StorePicker */}
    <Route path="/" component={StorePicker}/>
    {/* :storeId is creating a variable that's accessable in the component */}
    <Route path="/store/:storeId" component={App}/>
    {/* Fallback route */}
    <Route path="*" component={notFound}/>
  </Router>
)

//Adds the component we created to the #main div on the index page
ReactDom.render(routes, document.querySelector('#main'))





